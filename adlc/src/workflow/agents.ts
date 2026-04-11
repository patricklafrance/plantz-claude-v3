import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { query } from "@anthropic-ai/claude-agent-sdk";
import { parse } from "yaml";

import { resolveModel, MODEL_IDS, type ResolvedConfig } from "../config.js";
import type { DocCandidate } from "../context.js";

/** SDK-compatible agent definition. */
export type AgentDefinition = {
    description: string;
    tools?: string[];
    disallowedTools?: string[];
    prompt: string;
    model?: string;
    skills?: string[];
    maxTurns?: number;
    effort?: ("low" | "medium" | "high" | "max") | number;
    permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan" | "dontAsk" | "auto";
};

/** Frontmatter shape as parsed from YAML. */
interface AgentFrontmatter {
    name: string;
    description: string;
    model?: string;
    effort?: string | number;
    tools?: string[] | string;
    skills?: string[] | string;
    maxTurns?: number;
    disallowedTools?: string[] | string;
    permissionMode?: string;
}

/** Normalize a field that may be a comma-separated string or an array. */
function toStringArray(value: string[] | string | undefined): string[] | undefined {
    if (!value) {
        return undefined;
    }
    if (Array.isArray(value)) {
        return value;
    }
    return value
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
}

// At runtime this file lives at dist/workflow/agents.js.
// Agent .md prompts ship in the top-level agents/ directory (two levels up).
const AGENTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..", "agents");

/**
 * Parse a `.md` file with YAML frontmatter into an agent name + definition.
 */
function parseAgentFile(filePath: string): { name: string; definition: AgentDefinition } {
    const raw = readFileSync(filePath, "utf-8");

    // Split on the frontmatter fences (leading `---` and closing `---`).
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) {
        throw new Error(`Invalid agent file (missing frontmatter): ${filePath}`);
    }

    const frontmatter = parse(match[1]) as AgentFrontmatter;
    const prompt = match[2].trim();

    if (!frontmatter.name) {
        throw new Error(`Agent file missing 'name' in frontmatter: ${filePath}`);
    }
    if (!frontmatter.description) {
        throw new Error(`Agent file missing 'description' in frontmatter: ${filePath}`);
    }

    const definition: AgentDefinition = {
        description: frontmatter.description,
        prompt,
        model: resolveModel(frontmatter.model)
    };

    if (frontmatter.effort !== undefined) {
        definition.effort = frontmatter.effort as AgentDefinition["effort"];
    }
    const tools = toStringArray(frontmatter.tools);
    if (tools) {
        definition.tools = tools;
    }
    const skills = toStringArray(frontmatter.skills);
    if (skills) {
        definition.skills = skills;
    }
    if (frontmatter.maxTurns !== undefined) {
        definition.maxTurns = frontmatter.maxTurns;
    }
    const disallowedTools = toStringArray(frontmatter.disallowedTools);
    if (disallowedTools) {
        definition.disallowedTools = disallowedTools;
    }
    if (frontmatter.permissionMode) {
        definition.permissionMode = frontmatter.permissionMode as AgentDefinition["permissionMode"];
    }

    return { name: frontmatter.name, definition };
}

/**
 * Load a single agent definition by name.
 *
 * @throws if the file does not exist or has invalid frontmatter.
 */
export function loadAgent(name: string): { name: string; definition: AgentDefinition } {
    const filePath = join(AGENTS_DIR, `${name}.md`);

    try {
        return parseAgentFile(filePath);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            throw new Error(`Unknown agent: "${name}" (file not found: ${filePath})`, { cause: err });
        }
        throw err;
    }
}

/** Resolve a skill name to a `.claude/skills/{name}/SKILL.md` path relative to `cwd`. */
function resolveSkillName(name: string, cwd: string): string {
    return join(cwd, ".claude", "skills", name, "SKILL.md");
}

/**
 * Load all agent definitions from the agents directory.
 *
 * @param preamble - Optional project context preamble to prepend to every agent's prompt.
 * @param config - Optional resolved config; consumer-defined skills are merged into agent definitions.
 * @param cwd - Target repository root; used to resolve consumer skill names to paths.
 * @returns a record keyed by agent name.
 */
export function loadAllAgents(preamble?: string, config?: ResolvedConfig, cwd?: string): Record<string, AgentDefinition> {
    const files = readdirSync(AGENTS_DIR).filter(f => f.endsWith(".md"));
    const agents: Record<string, AgentDefinition> = {};
    const agentOverrides = config?.agents ?? {};

    for (const file of files) {
        const { name, definition } = parseAgentFile(join(AGENTS_DIR, file));

        if (preamble) {
            definition.prompt = `${preamble}\n\n---\n\n${definition.prompt}`;
        }

        const extra = agentOverrides[name]?.skills;
        if (extra?.length && cwd) {
            const resolved = extra.map(s => resolveSkillName(s, cwd));
            definition.skills = [...(definition.skills ?? []), ...resolved];
        }

        agents[name] = definition;
    }

    return agents;
}

/** Run a single agent to completion via the SDK. */
export async function runAgent(agentName: string, prompt: string, cwd: string, agents: Record<string, AgentDefinition>): Promise<string> {
    const conversation = query({
        prompt,
        options: {
            agent: agentName,
            agents,
            cwd,
            settingSources: ["project"],
            permissionMode: "bypassPermissions",
            allowDangerouslySkipPermissions: true,
            persistSession: false
        }
    });

    let result = "";
    for await (const message of conversation) {
        if (message.type === "result") {
            if (message.subtype === "success") {
                result = message.result;
            } else {
                const msg = message as Record<string, unknown>;
                const errors = Array.isArray(msg.errors) ? (msg.errors as string[]).join("; ") : String(msg.subtype);
                throw new Error(`Agent "${agentName}" failed (${msg.subtype}): ${errors}`);
            }
        }
    }
    return result;
}

// ── Reference doc classification via agent ──────────────

const DOC_CATEGORIES = [
    "architecture — repo structure, overall architecture",
    "adr — architectural decisions, decision logs",
    "operations — operational decisions, CI/CD operations",
    "placement — code placement rules, module responsibilities",
    "api — data layer, API patterns, MSW, TanStack Query",
    "storybook — Storybook conventions, story patterns",
    "components — component library, design system (e.g. shadcn)",
    "styling — CSS, Tailwind, PostCSS, color modes, themes",
    "browser — browser testing, agent-browser CLI",
    "design — UI/UX design principles"
];

/**
 * Use a lightweight agent to classify reference docs into semantic categories.
 * Returns a mapping of category → relative file paths.
 */
export async function classifyReferenceDocs(candidates: DocCandidate[], cwd: string): Promise<Record<string, string[]>> {
    if (candidates.length === 0) {
        return {};
    }

    const fileList = candidates.map(c => `- ${c.relPath}: "${c.title}"`).join("\n");

    const prompt = [
        "Classify these reference documentation files into semantic categories based on their path and title.",
        "",
        "Files:",
        fileList,
        "",
        "Categories:",
        ...DOC_CATEGORIES.map(c => `- ${c}`),
        "",
        "Rules:",
        "- Map each file to the single most relevant category.",
        "- A category can have multiple files — use an array.",
        "- Not every file needs a category — skip files that don't clearly fit.",
        "- Not every category needs a file — skip categories with no match.",
        "",
        "Respond with ONLY a valid JSON object mapping category names to arrays of file paths. No explanation, no markdown fences.",
        'Example: {"architecture": ["docs/ARCHITECTURE.md"], "styling": ["docs/references/tailwind.md", "docs/references/color-mode.md"]}'
    ].join("\n");

    const agents: Record<string, AgentDefinition> = {
        "_doc-classifier": {
            description: "Classify reference docs into semantic categories",
            prompt: "You classify documentation files. Respond with only JSON.",
            model: MODEL_IDS.haiku,
            maxTurns: 1,
            permissionMode: "bypassPermissions"
        }
    };

    const result = await runAgent("_doc-classifier", prompt, cwd, agents);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("Doc classifier returned no JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    // Validate: only keep entries with known candidate paths
    const validPaths = new Set(candidates.map(c => c.relPath));
    const mapping: Record<string, string[]> = {};

    for (const [key, value] of Object.entries(parsed)) {
        if (Array.isArray(value)) {
            const valid = (value as unknown[]).filter((v): v is string => typeof v === "string" && validPaths.has(v));
            if (valid.length > 0) {
                mapping[key] = valid;
            }
        } else if (typeof value === "string" && validPaths.has(value)) {
            mapping[key] = [value];
        }
    }

    return mapping;
}
