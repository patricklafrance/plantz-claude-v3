/**
 * Project context preamble — assembled at the start of every run()
 * and injected into every agent and skill prompt.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import type { ResolvedConfig } from "./config.ts";
import { REQUIRED_SCRIPTS } from "./preflight.ts";

// ── Types ────────────────────────────────────────────────

interface ProjectContext {
    commands: Record<string, string>;
    referenceDocs: Record<string, string[]>;
    structure: {
        apps: string;
        hostApp: string;
        modules: string;
        packages: string;
        license: string;
        author?: string;
    };
}

export interface DocCandidate {
    relPath: string;
    title: string;
}

// ── Reference doc discovery ─────────────────────────────

/** Recursively collect all .md files under a directory. */
function collectMarkdownFiles(dir: string): string[] {
    const results: string[] = [];

    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory() && entry.name !== "node_modules") {
            results.push(...collectMarkdownFiles(fullPath));
        } else if (entry.name.endsWith(".md")) {
            results.push(fullPath);
        }
    }

    return results;
}

/** Extract the first `# heading` from a markdown file. */
function extractTitle(absPath: string): string {
    try {
        const content = readFileSync(absPath, "utf-8");
        const match = content.match(/^#\s+(.+)$/m);
        return match ? match[1].trim() : "";
    } catch {
        return "";
    }
}

/** Discover all markdown files in the reference directory with their titles. */
export function discoverReferenceDocs(refDir: string, cwd: string): DocCandidate[] {
    if (!existsSync(refDir)) {
        return [];
    }

    return collectMarkdownFiles(refDir).map(absPath => ({
        relPath: relative(cwd, absPath).replace(/\\/g, "/"),
        title: extractTitle(absPath)
    }));
}

// ── Heuristic fallback ──────────────────────────────────

const REF_DOC_HEURISTICS: Record<string, RegExp> = {
    architecture: /architect/i,
    adr: /\badr\b|decision/i,
    operations: /\bodr\b|operat/i,
    placement: /placement/i,
    api: /data|msw|tanstack|query/i,
    storybook: /storybook/i,
    components: /shadcn|component/i,
    styling: /tailwind|css|style|postcss|color.mode|dark.mode/i,
    browser: /browser/i,
    design: /design|ui-ux/i
};

/** Classify doc candidates using filename/title heuristics. Used as fallback when agent classification fails. */
export function classifyWithHeuristics(candidates: DocCandidate[]): Record<string, string[]> {
    const docs: Record<string, string[]> = {};

    for (const { relPath, title } of candidates) {
        const text = `${relPath} ${title}`;

        for (const [key, pattern] of Object.entries(REF_DOC_HEURISTICS)) {
            if (pattern.test(text)) {
                (docs[key] ??= []).push(relPath);
                break;
            }
        }
    }

    return docs;
}

// ── Public API ───────────────────────────────────────────

/**
 * Assemble the full project context from three sources:
 * 1. Standardized scripts from root package.json
 * 2. Reference doc mappings from the reference directory
 * 3. Structure and scaffolding values from resolved config
 *
 * @param classifyDocs - Optional async classifier (agent-based). Falls back to heuristics on failure or when omitted.
 */
export async function buildProjectContext(
    cwd: string,
    config: ResolvedConfig,
    classifyDocs?: (candidates: DocCandidate[]) => Promise<Record<string, string[]>>
): Promise<ProjectContext> {
    // 1. Commands — only the standardized scripts
    const commands: Record<string, string> = {};
    let scripts: Record<string, string> = {};

    try {
        const pkgPath = join(cwd, "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { scripts?: Record<string, string> };
        scripts = pkg.scripts ?? {};
    } catch {
        // No package.json or unreadable — commands will be empty
    }

    for (const name of REQUIRED_SCRIPTS) {
        if (scripts[name]) {
            commands[name] = `pnpm ${name}`;
        }
    }

    // 2. Reference docs
    const refDir = join(cwd, config.structure.reference);
    const candidates = discoverReferenceDocs(refDir, cwd);

    let referenceDocs: Record<string, string[]>;
    if (classifyDocs && candidates.length > 0) {
        try {
            referenceDocs = await classifyDocs(candidates);
        } catch {
            referenceDocs = classifyWithHeuristics(candidates);
        }
    } else {
        referenceDocs = classifyWithHeuristics(candidates);
    }

    // 3. Structure
    const hostAppPath = `${config.structure.apps}/${config.structure.hostApp}`.replace(/^\.\//, "");

    return {
        commands,
        referenceDocs,
        structure: {
            apps: config.structure.apps,
            hostApp: hostAppPath,
            modules: config.structure.modules,
            packages: config.structure.packages,
            license: config.scaffolding.packageMeta.license,
            author: config.scaffolding.packageMeta.author
        }
    };
}

/** Format a ProjectContext as a markdown preamble for prompt injection. */
export function contextToPreamble(ctx: ProjectContext): string {
    const lines: string[] = ["## Project context", ""];

    // Commands section
    const commandEntries = Object.entries(ctx.commands);

    if (commandEntries.length > 0) {
        lines.push("### Commands", "");

        for (const [name, cmd] of commandEntries) {
            lines.push(`- ${name}: \`${cmd}\``);
        }

        lines.push("");
    }

    // Reference docs section
    const refEntries = Object.entries(ctx.referenceDocs);

    if (refEntries.length > 0) {
        lines.push("### Reference docs", "");

        for (const [key, paths] of refEntries) {
            lines.push(`- ${key}: ${paths.join(", ")}`);
        }

        lines.push("");
    }

    // Structure section
    lines.push("### Structure", "");
    lines.push(`- Apps: ${ctx.structure.apps}`);
    lines.push(`- Host app: ${ctx.structure.hostApp}`);
    lines.push(`- Modules: ${ctx.structure.modules}`);
    lines.push(`- Packages: ${ctx.structure.packages}`);
    lines.push(`- License: ${ctx.structure.license}`);

    if (ctx.structure.author) {
        lines.push(`- Author: ${ctx.structure.author}`);
    }

    return lines.join("\n");
}
