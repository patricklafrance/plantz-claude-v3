import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { query } from "@anthropic-ai/claude-agent-sdk";
import pc from "picocolors";
import { parse } from "yaml";

import { resolveModel, type ResolvedConfig } from "../config.ts";
import type { DocCandidate } from "../context.ts";
import type { SDKHooks } from "../hooks/create-hooks.ts";
import { formatDuration, formatTokens, type Progress } from "../progress.ts";

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
export function loadAllAgents(preamble?: string, config?: ResolvedConfig, cwd?: string, runDirName?: string): Record<string, AgentDefinition> {
    const files = readdirSync(AGENTS_DIR).filter(f => f.endsWith(".md"));
    const agents: Record<string, AgentDefinition> = {};
    const agentOverrides = config?.agents ?? {};

    for (const file of files) {
        const { name, definition } = parseAgentFile(join(AGENTS_DIR, file));

        if (preamble) {
            definition.prompt = `${preamble}\n\n---\n\n${definition.prompt}`;
        }

        if (runDirName) {
            const runDirBlock = [
                "## ADLC Run Directory",
                `All ADLC working artifacts are stored in: \`.adlc/${runDirName}/\``,
                "Read and write all ADLC files (domain-mapping.md, plan-header.md, slices/, etc.) in this directory."
            ].join("\n");
            definition.prompt = `${runDirBlock}\n\n${definition.prompt}`;
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

const STREAM_PREFIX = `    ${pc.dim("│")} `;
const TOOL_PREFIX = `    ${pc.dim("│")} ${pc.dim("→")} `;

// Sub-agent output is indented one level deeper for visual distinction.
const SUB_STREAM_PREFIX = `    ${pc.dim("│")}   ${pc.dim("│")} `;
const SUB_TOOL_PREFIX = `    ${pc.dim("│")}   ${pc.dim("│")} ${pc.dim("→")} `;

/** Write a prefixed, dimmed line to stdout. Handles multi-line text and tracks newline state. */
function writeStreamLine(text: string, state: { needsPrefix: boolean }, prefix = STREAM_PREFIX): void {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        if (i > 0) {
            process.stdout.write("\n");
            state.needsPrefix = true;
        }
        if (lines[i].length > 0) {
            if (state.needsPrefix) {
                process.stdout.write(prefix);
                state.needsPrefix = false;
            }
            process.stdout.write(pc.dim(lines[i]));
        }
    }
}

/** Write a tool activity line to stdout. */
function writeToolLine(text: string, prefix = TOOL_PREFIX): void {
    for (const line of text.split("\n")) {
        if (line.trim().length > 0) {
            process.stdout.write(`${prefix}${pc.dim(line)}\n`);
        }
    }
}

const TOOL_DISPLAY_KEYS = ["file_path", "command", "pattern", "query", "url", "description", "prompt"] as const;

/** Extract the most meaningful argument from a pre-parsed tool input for display. */
function formatToolArgs(toolName: string, input: Record<string, unknown> | undefined): string {
    if (!input) {
        return toolName;
    }
    for (const key of TOOL_DISPLAY_KEYS) {
        const raw = input[key];
        if (typeof raw !== "string") {
            continue;
        }
        return `${toolName} ${raw}`;
    }
    return toolName;
}

/** Extract the most meaningful argument from a tool call for display. */
function formatToolCall(toolName: string, rawInput: string): string {
    try {
        return formatToolArgs(toolName, JSON.parse(rawInput) as Record<string, unknown>);
    } catch {
        // JSON parse failed — just use tool name
        return toolName;
    }
}

/** Throw a standardized agent failure error. */
export function throwAgentError(agentName: string, msg: Record<string, unknown>): never {
    const errors = Array.isArray(msg.errors) ? (msg.errors as string[]).join("; ") : String(msg.subtype);
    throw new Error(`Agent "${agentName}" failed (${msg.subtype}): ${errors}`);
}

/** Terminate the current partial output line before writing a new block-level line. */
function ensureNewLine(hasOutput: boolean, lineState: { needsPrefix: boolean }): void {
    if (hasOutput && !lineState.needsPrefix) {
        process.stdout.write("\n");
        lineState.needsPrefix = true;
    }
}

/** Write a "↳ Done (N tool uses · Xk tokens · Xs)" summary line with the given prefix. */
function writeDoneLine(prefix: string, startTime: number, toolCount: number, tokenCount?: number): void {
    const elapsed = formatDuration(Date.now() - startTime);
    const parts: string[] = [];
    if (toolCount > 0) {
        parts.push(`${toolCount} tool uses`);
    }
    if (tokenCount != null && tokenCount > 0) {
        parts.push(`${formatTokens(tokenCount)} tokens`);
    }
    parts.push(elapsed);
    process.stdout.write(`${prefix}${pc.dim(`\u21b3 Done (${parts.join(" \u00b7 ")})`)}\n`);
}

/** Print "Done" summaries for completed Agent tool calls and clear the tracking map. */
function flushAgentToolSummaries(
    activeAgentTools: Map<string, { startTime: number; toolCount: number; tokenCount: number }>,
    progress: Progress | undefined,
    hasOutput: boolean,
    lineState: { needsPrefix: boolean }
): void {
    if (activeAgentTools.size === 0) {
        return;
    }

    for (const [, { startTime, toolCount, tokenCount }] of activeAgentTools) {
        progress?.clearSpinner();
        ensureNewLine(hasOutput, lineState);
        writeDoneLine(SUB_STREAM_PREFIX, startTime, toolCount, tokenCount);
        lineState.needsPrefix = true;
    }
    activeAgentTools.clear();
}

/** Run a single agent to completion via the SDK, forwarding output to stdout. */
export async function runAgent(
    agentName: string,
    prompt: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks,
    resumeSessionId?: string,
    env?: Record<string, string>
): Promise<{ result: string; sessionId: string }> {
    progress?.agent(agentName, resumeSessionId ? "resume" : "spawn", prompt);

    // Block interactive tools globally — the pipeline is headless.
    const patchedAgents = Object.fromEntries(
        Object.entries(agents).map(([name, def]) => {
            const existing = def.disallowedTools ?? [];
            if (existing.includes("AskUserQuestion")) {
                return [name, def];
            }
            return [name, { ...def, disallowedTools: [...existing, "AskUserQuestion"] }];
        })
    );

    const conversation = query({
        prompt,
        options: {
            agent: agentName,
            agents: patchedAgents,
            cwd,
            settingSources: ["project"],
            permissionMode: "bypassPermissions",
            allowDangerouslySkipPermissions: true,
            persistSession: true,
            includePartialMessages: true,
            ...(hooks ? { hooks } : {}),
            ...(resumeSessionId ? { resume: resumeSessionId } : {}),
            ...(env ? { env } : {})
        }
    });

    let result = "";
    let sessionId = "";
    let hasOutput = false;
    const lineState = { needsPrefix: true };
    const agentStartTime = Date.now();
    let toolUseCount = 0;

    let activeToolName: string | null = null;
    let activeToolInput = "";
    let activeBlockType: string | null = null;

    let totalTokens = 0;
    const activeAgentTools = new Map<string, { startTime: number; toolCount: number; tokenCount: number }>();

    for await (const message of conversation) {
        const parentId = (message as { parent_tool_use_id?: string | null }).parent_tool_use_id;

        if (message.type === "stream_event") {
            // Choose prefix based on whether this is a sub-agent message
            const sp = parentId ? SUB_STREAM_PREFIX : STREAM_PREFIX;
            const tp = parentId ? SUB_TOOL_PREFIX : TOOL_PREFIX;

            const event = message.event as {
                type: string;
                content_block?: { type: string; id?: string; name?: string };
                delta?: { type: string; text?: string; partial_json?: string };
            };

            if (event.type === "message_start") {
                // Only flush sub-agent summaries on main agent turn boundaries
                if (!parentId) {
                    flushAgentToolSummaries(activeAgentTools, progress, hasOutput, lineState);
                }
            } else if (event.type === "content_block_start") {
                const blockType = event.content_block?.type;
                activeBlockType = blockType ?? null;

                if (blockType === "tool_use") {
                    activeToolName = event.content_block?.name ?? null;
                    activeToolInput = "";

                    // Track Agent sub-agent spawns (main agent only)
                    if (!parentId && activeToolName === "Agent" && event.content_block?.id) {
                        activeAgentTools.set(event.content_block.id, {
                            startTime: Date.now(),
                            toolCount: 0,
                            tokenCount: 0
                        });
                    }
                } else if (blockType === "text" && hasOutput && !lineState.needsPrefix) {
                    progress?.clearSpinner();
                    ensureNewLine(hasOutput, lineState);
                } else if (blockType === "thinking") {
                    // Thinking blocks produce no visible output — keep spinner alive
                    progress?.resumeSpinner();
                }
            } else if (event.type === "content_block_delta") {
                if (event.delta?.type === "text_delta" && event.delta.text) {
                    progress?.clearSpinner();
                    writeStreamLine(event.delta.text, lineState, sp);
                    hasOutput = true;
                } else if (event.delta?.type === "input_json_delta" && event.delta.partial_json) {
                    // Cap buffer to avoid unbounded accumulation for large inputs
                    if (activeToolInput.length < 4096) {
                        activeToolInput += event.delta.partial_json;
                    }
                }
            } else if (event.type === "content_block_stop") {
                if (activeBlockType === "tool_use" && activeToolName) {
                    progress?.clearSpinner();
                    ensureNewLine(hasOutput, lineState);
                    writeToolLine(formatToolCall(activeToolName, activeToolInput), tp);
                    lineState.needsPrefix = true;
                    hasOutput = true;
                    if (!parentId) {
                        toolUseCount++;
                    } else {
                        const tracker = activeAgentTools.get(parentId);
                        if (tracker) {
                            tracker.toolCount++;
                        }
                    }
                    progress?.resumeSpinner();
                }
                activeToolName = null;
                activeToolInput = "";
                activeBlockType = null;
            }
        } else if (message.type === "assistant" && parentId) {
            // Sub-agent completed turn — display tools and track usage.
            // The SDK sends sub-agent output as batched assistant messages, not stream_events.
            const betaMsg = (
                message as {
                    message?: {
                        content?: Array<{ type: string; name?: string; input?: Record<string, unknown> }>;
                        usage?: { input_tokens?: number; output_tokens?: number };
                    };
                }
            ).message;
            if (!betaMsg) {
                continue;
            }

            const tracker = activeAgentTools.get(parentId);

            if (tracker && betaMsg.usage) {
                tracker.tokenCount += (betaMsg.usage.input_tokens ?? 0) + (betaMsg.usage.output_tokens ?? 0);
            }

            if (betaMsg.content) {
                for (const block of betaMsg.content) {
                    if (block.type === "tool_use" && block.name) {
                        progress?.clearSpinner();
                        ensureNewLine(hasOutput, lineState);
                        writeToolLine(formatToolArgs(block.name, block.input), SUB_TOOL_PREFIX);
                        lineState.needsPrefix = true;
                        hasOutput = true;
                        if (tracker) {
                            tracker.toolCount++;
                        }
                        progress?.resumeSpinner();
                    }
                }
            }
        } else if (message.type === "tool_use_summary") {
            const msg = message as { summary?: string };
            if (msg.summary) {
                progress?.clearSpinner();
                ensureNewLine(hasOutput, lineState);
                writeToolLine(msg.summary);
                lineState.needsPrefix = true;
                hasOutput = true;
            }
        } else if (message.type === "result") {
            flushAgentToolSummaries(activeAgentTools, progress, hasOutput, lineState);
            ensureNewLine(hasOutput, lineState);

            // Extract total token usage from the result message
            const resultUsage = (message as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
            if (resultUsage) {
                totalTokens = (resultUsage.input_tokens ?? 0) + (resultUsage.output_tokens ?? 0);
            }

            if (message.subtype === "success") {
                result = message.result;
                sessionId = (message as { session_id?: string }).session_id ?? "";
            } else {
                throwAgentError(agentName, message as Record<string, unknown>);
            }
        }
    }

    progress?.clearSpinner();
    ensureNewLine(hasOutput, lineState);
    writeDoneLine(STREAM_PREFIX, agentStartTime, toolUseCount, totalTokens);

    return { result, sessionId };
}

// ── Reference doc classification via agent ──────────────

const DOC_CATEGORIES = [
    "architecture — repo structure, overall architecture",
    "decisions — architectural and operational decisions, decision logs",
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
export async function classifyReferenceDocs(candidates: DocCandidate[], cwd: string, progress?: Progress): Promise<Record<string, string[]>> {
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

    const { name, definition } = loadAgent("doc-classifier");
    const agents: Record<string, AgentDefinition> = { [name]: definition };

    const { result } = await runAgent(name, prompt, cwd, agents, progress);

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
