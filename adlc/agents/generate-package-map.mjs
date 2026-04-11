#!/usr/bin/env node

/**
 * generate-package-map.mjs
 *
 * Reads `.adlc/current-slice.md`, parses the Reference Packages section,
 * resolves package names to filesystem paths, globs source files, and writes
 * `.adlc/current-package-map.md` with a file tree + highlighted files per package.
 *
 * Usage: node .claude/agents/scripts/generate-package-map.mjs
 *
 * Produces `.adlc/current-package-map.md` — consumed by the Explore agent to
 * selectively read key files instead of scanning entire packages.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const cwd = process.cwd();
const ADLC_DIR = resolve(cwd, ".adlc");
const SLICE_PATH = resolve(ADLC_DIR, "current-slice.md");
const OUTPUT_PATH = resolve(ADLC_DIR, "current-package-map.md");

// ── 1. Read and parse slice ────────────────────────────────

if (!existsSync(SLICE_PATH)) {
    // No current slice — nothing to do.
    process.exit(0);
}

const sliceContent = readFileSync(SLICE_PATH, "utf8");

const refSection = extractSection(sliceContent, "Reference Packages");

if (!refSection) {
    // Slice has no Reference Packages section — skip.
    process.exit(0);
}

const references = parseReferences(refSection);

if (references.length === 0) {
    process.exit(0);
}

// ── 2. Build workspace name → path mapping ─────────────────

const nameToPath = buildWorkspaceMap(cwd);

// ── 3. Generate map for each reference package ─────────────

const sections = [];

for (const ref of references) {
    const resolved = resolvePackageRef(ref.name, nameToPath, cwd);

    if (!resolved) {
        sections.push(`## ${ref.name} → (not found in workspace)\n`);
        continue;
    }

    const { displayPath, srcDir, pkgRoot } = resolved;
    const sourceFiles = existsSync(srcDir) ? globSourceFiles(srcDir, pkgRoot) : [];

    let section = `## ${ref.name} → ${displayPath}\n\n`;

    section += "### Source Files\n\n";
    if (sourceFiles.length === 0) {
        section += "_(no source files found)_\n";
    } else {
        for (const f of sourceFiles) {
            section += `- ${f}\n`;
        }
    }

    section += "\n### Highlighted Files (from planner)\n\n";
    section += `${ref.description}\n`;

    sections.push(section);
}

// ── 4. Write output ────────────────────────────────────────

const output = `# Package Map\n\nGenerated from \`.adlc/current-slice.md\` reference packages.\n\n${sections.join("\n")}`;

mkdirSync(ADLC_DIR, { recursive: true });
writeFileSync(OUTPUT_PATH, output);

// ── Helpers ────────────────────────────────────────────────

/**
 * Resolve a package reference to a filesystem path.
 *
 * First tries a direct workspace map lookup. If that fails, attempts to
 * resolve the reference as a subpath export (e.g., `@packages/core-plants/db`
 * → base package `@packages/core-plants` with subpath `./db`).
 *
 * Returns { displayPath, srcDir, pkgRoot } or null if unresolvable.
 */
function resolvePackageRef(name, pkgMap, root) {
    // Direct lookup — package name matches exactly.
    const directPath = pkgMap.get(name);

    if (directPath) {
        return {
            displayPath: relative(root, directPath).replace(/\\/g, "/"),
            srcDir: resolve(directPath, "src"),
            pkgRoot: directPath
        };
    }

    // Subpath export resolution.
    // For scoped packages like `@scope/pkg/sub`, the base is `@scope/pkg`
    // and the subpath is `./sub`. For deeper paths like `@scope/pkg/a/b`,
    // the base is still `@scope/pkg` and the subpath is `./a/b`.
    const subpathResult = resolveSubpathExport(name, pkgMap);

    if (subpathResult) {
        const { basePkgPath, entryDir } = subpathResult;
        const absoluteEntryDir = resolve(basePkgPath, entryDir);

        return {
            displayPath: relative(root, absoluteEntryDir).replace(/\\/g, "/"),
            srcDir: absoluteEntryDir,
            pkgRoot: basePkgPath
        };
    }

    return null;
}

/**
 * Try to resolve a package reference as a subpath export.
 *
 * Given `@scope/pkg/sub`, looks up `@scope/pkg` in the workspace map,
 * reads its package.json exports, and resolves the `./sub` subpath to
 * the directory containing its entry point.
 *
 * Returns { basePkgPath, entryDir } or null.
 */
function resolveSubpathExport(name, pkgMap) {
    // For scoped packages: @scope/pkg/sub → base = @scope/pkg, rest = sub
    // For unscoped packages: pkg/sub → base = pkg, rest = sub
    let baseName;
    let subpath;

    if (name.startsWith("@")) {
        // Scoped: split after the second segment
        const parts = name.split("/");

        if (parts.length < 3) {
            return null; // Just `@scope/pkg` with no subpath
        }

        baseName = `${parts[0]}/${parts[1]}`;
        subpath = `./${parts.slice(2).join("/")}`;
    } else {
        const slashIdx = name.indexOf("/");

        if (slashIdx === -1) {
            return null; // No subpath
        }

        baseName = name.slice(0, slashIdx);
        subpath = `./${name.slice(slashIdx + 1)}`;
    }

    const basePkgPath = pkgMap.get(baseName);

    if (!basePkgPath) {
        return null;
    }

    // Read the base package's package.json to get its exports field.
    let pkg;
    try {
        pkg = JSON.parse(readFileSync(resolve(basePkgPath, "package.json"), "utf8"));
    } catch {
        return null;
    }

    const exports = pkg.exports;

    if (!exports || typeof exports !== "object") {
        return null;
    }

    const exportEntry = exports[subpath];

    if (!exportEntry) {
        return null;
    }

    // The export value can be a string or an object with conditions
    // (e.g., { import: "./src/foo.ts", require: "./src/foo.cjs" }).
    const entryFile = typeof exportEntry === "string" ? exportEntry : resolveConditionValue(exportEntry);

    if (!entryFile) {
        return null;
    }

    // Use the directory containing the entry point file.
    const entryDir = dirname(entryFile);

    return { basePkgPath, entryDir };
}

/**
 * Resolve a conditional export value object to a file path string.
 * Tries common conditions in priority order.
 */
function resolveConditionValue(obj) {
    if (typeof obj === "string") {
        return obj;
    }

    if (typeof obj !== "object" || obj === null) {
        return null;
    }

    // Try conditions in priority order
    const conditions = ["import", "default", "types", "require", "node", "browser"];

    for (const cond of conditions) {
        if (obj[cond]) {
            const val = obj[cond];

            // Could be nested conditions
            if (typeof val === "string") {
                return val;
            }

            if (typeof val === "object") {
                return resolveConditionValue(val);
            }
        }
    }

    // Fallback: take the first value
    const values = Object.values(obj);

    for (const val of values) {
        if (typeof val === "string") {
            return val;
        }
    }

    return null;
}

/**
 * Extract the content of a ## section from markdown.
 * Returns the text between the header and the next ## or end of file.
 */
function extractSection(markdown, heading) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^## ${escaped}\\s*$`, "m");
    const match = markdown.match(re);

    if (!match) {
        return null;
    }

    const start = match.index + match[0].length;
    const nextSection = markdown.indexOf("\n## ", start);
    const end = nextSection === -1 ? markdown.length : nextSection;

    return markdown.slice(start, end).trim();
}

/**
 * Parse reference package lines from the section content.
 *
 * Each line: - `@packages/core-plants` — description with `highlighted files`
 */
function parseReferences(section) {
    const lines = section.split("\n").filter(l => l.trim().startsWith("- "));
    const refs = [];

    for (const line of lines) {
        // Match: - `@scope/name` — description
        const m = line.match(/^-\s+`([^`]+)`\s*(?:\(.*?\)\s*)?[—–-]+\s*(.+)$/);

        if (m) {
            refs.push({ name: m[1].trim(), description: m[2].trim() });
        }
    }

    return refs;
}

/**
 * Scan workspace for all package.json files and build a name → absolute path map.
 * Directories match the config.structure defaults: apps, packages, modules.
 */
function buildWorkspaceMap(root) {
    const map = new Map();
    const dirs = ["apps", "packages", "modules"];

    for (const dir of dirs) {
        const base = resolve(root, dir);

        if (!existsSync(base)) {
            continue;
        }

        walkForPackageJson(base, map);
    }

    return map;
}

/**
 * Recursively walk directories looking for package.json files.
 * Skips node_modules and .turbo directories.
 */
function walkForPackageJson(dir, map) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }

    for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".turbo") {
            continue;
        }

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
            walkForPackageJson(fullPath, map);
        } else if (entry.name === "package.json") {
            try {
                const pkg = JSON.parse(readFileSync(fullPath, "utf8"));

                if (pkg.name) {
                    map.set(pkg.name, dir);
                }
            } catch {
                // Skip malformed package.json
            }
        }
    }
}

/**
 * Recursively glob for .ts/.tsx files under a directory.
 * Returns paths relative to pkgRoot prefixed with "src/".
 */
function globSourceFiles(dir, pkgRoot) {
    const results = [];

    function walk(current) {
        let entries;
        try {
            entries = readdirSync(current, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (entry.name === "node_modules" || entry.name === ".turbo") {
                continue;
            }

            const fullPath = join(current, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (/\.(ts|tsx)$/.test(entry.name)) {
                results.push(relative(pkgRoot, fullPath).replace(/\\/g, "/"));
            }
        }
    }

    walk(dir);
    results.sort();

    return results;
}
