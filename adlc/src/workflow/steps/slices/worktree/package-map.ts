/**
 * Generate `.adlc/current-package-map.md` from the current slice's reference packages.
 *
 * Reads `.adlc/current-slice.md`, parses the "Reference Packages" section,
 * resolves package names to filesystem paths, globs source files, and writes
 * a file tree + highlighted files per package.
 *
 * Originally lived as `adlc/agents/generate-package-map.mjs` and was executed
 * by the explorer agent via Bash. Now runs in the seeder so the map is ready
 * before the explorer starts.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

// ── Types ────────────────────────────────────────────────

interface PackageRef {
    name: string;
    description: string;
}

interface ResolvedRef {
    displayPath: string;
    srcDir: string;
    pkgRoot: string;
}

// ── Public API ───────────────────────────────────────────

/**
 * Generate `current-package-map.md` in the worktree's run directory.
 *
 * Reads `current-slice.md` from the worktree's run directory, extracts
 * reference packages, resolves them against the workspace, and writes the map.
 *
 * No-ops silently when the slice has no reference packages section.
 */
export function generatePackageMap(worktreePath: string, runDirName: string): void {
    const adlcDir = resolve(worktreePath, ".adlc", runDirName);
    const slicePath = resolve(adlcDir, "current-slice.md");
    const outputPath = resolve(adlcDir, "current-package-map.md");

    if (!existsSync(slicePath)) {
        return;
    }

    const sliceContent = readFileSync(slicePath, "utf-8");
    const refSection = extractSection(sliceContent, "Reference Packages");

    if (!refSection) {
        return;
    }

    const references = parseReferences(refSection);

    if (references.length === 0) {
        return;
    }

    const nameToPath = buildWorkspaceMap(worktreePath);
    const sections: string[] = [];

    for (const ref of references) {
        const resolved = resolvePackageRef(ref.name, nameToPath, worktreePath);

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

    const output = `# Package Map\n\nGenerated from \`.adlc/current-slice.md\` reference packages.\n\n${sections.join("\n")}`;
    writeFileSync(outputPath, output);
}

// ── Helpers ──────────────────────────────────────────────

/** Extract the content of a `## <heading>` section from markdown. */
export function extractSection(markdown: string, heading: string): string | null {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^## ${escaped}\\s*$`, "m");
    const match = markdown.match(re);

    if (!match || match.index === undefined) {
        return null;
    }

    const start = match.index + match[0].length;
    const nextSection = markdown.indexOf("\n## ", start);
    const end = nextSection === -1 ? markdown.length : nextSection;

    return markdown.slice(start, end).trim();
}

/** Parse reference package lines from the section content. */
export function parseReferences(section: string): PackageRef[] {
    const lines = section.split("\n").filter(l => l.trim().startsWith("- "));
    const refs: PackageRef[] = [];

    for (const line of lines) {
        const m = line.match(/^-\s+`([^`]+)`\s*(?:\(.*?\)\s*)?[—–-]+\s*(.+)$/);

        if (m) {
            refs.push({ name: m[1].trim(), description: m[2].trim() });
        }
    }

    return refs;
}

/**
 * Scan workspace directories for package.json files and build a name → path map.
 */
export function buildWorkspaceMap(root: string): Map<string, string> {
    const map = new Map<string, string>();
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

/** Recursively walk directories looking for package.json files. */
function walkForPackageJson(dir: string, map: Map<string, string>): void {
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
                const pkg = JSON.parse(readFileSync(fullPath, "utf-8")) as { name?: string };

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
 * Resolve a package reference to a filesystem path.
 *
 * First tries a direct workspace map lookup. If that fails, attempts to
 * resolve the reference as a subpath export (e.g., `@packages/core-plants/db`
 * → base package `@packages/core-plants` with subpath `./db`).
 */
export function resolvePackageRef(name: string, pkgMap: Map<string, string>, root: string): ResolvedRef | null {
    const directPath = pkgMap.get(name);

    if (directPath) {
        return {
            displayPath: relative(root, directPath).replace(/\\/g, "/"),
            srcDir: resolve(directPath, "src"),
            pkgRoot: directPath
        };
    }

    const subpathResult = resolveSubpathExport(name, pkgMap);

    if (subpathResult) {
        const absoluteEntryDir = resolve(subpathResult.basePkgPath, subpathResult.entryDir);

        return {
            displayPath: relative(root, absoluteEntryDir).replace(/\\/g, "/"),
            srcDir: absoluteEntryDir,
            pkgRoot: subpathResult.basePkgPath
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
 */
function resolveSubpathExport(name: string, pkgMap: Map<string, string>): { basePkgPath: string; entryDir: string } | null {
    let baseName: string;
    let subpath: string;

    if (name.startsWith("@")) {
        const parts = name.split("/");

        if (parts.length < 3) {
            return null;
        }

        baseName = `${parts[0]}/${parts[1]}`;
        subpath = `./${parts.slice(2).join("/")}`;
    } else {
        const slashIdx = name.indexOf("/");

        if (slashIdx === -1) {
            return null;
        }

        baseName = name.slice(0, slashIdx);
        subpath = `./${name.slice(slashIdx + 1)}`;
    }

    const basePkgPath = pkgMap.get(baseName);

    if (!basePkgPath) {
        return null;
    }

    let pkg: { exports?: Record<string, unknown> };
    try {
        pkg = JSON.parse(readFileSync(resolve(basePkgPath, "package.json"), "utf-8")) as { exports?: Record<string, unknown> };
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

    const entryFile = typeof exportEntry === "string" ? exportEntry : resolveConditionValue(exportEntry);

    if (!entryFile) {
        return null;
    }

    return { basePkgPath, entryDir: dirname(entryFile) };
}

/** Resolve a conditional export value object to a file path string. */
function resolveConditionValue(obj: unknown): string | null {
    if (typeof obj === "string") {
        return obj;
    }

    if (typeof obj !== "object" || obj === null) {
        return null;
    }

    const record = obj as Record<string, unknown>;
    const conditions = ["import", "default", "types", "require", "node", "browser"];

    for (const cond of conditions) {
        if (record[cond]) {
            const val = record[cond];

            if (typeof val === "string") {
                return val;
            }

            if (typeof val === "object") {
                return resolveConditionValue(val);
            }
        }
    }

    for (const val of Object.values(record)) {
        if (typeof val === "string") {
            return val;
        }
    }

    return null;
}

/** Recursively glob for .ts/.tsx files under a directory. Returns paths relative to pkgRoot. */
export function globSourceFiles(dir: string, pkgRoot: string): string[] {
    const results: string[] = [];

    function walk(current: string): void {
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
