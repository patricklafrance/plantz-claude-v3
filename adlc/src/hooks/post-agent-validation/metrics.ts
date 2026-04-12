/**
 * Parse a subagent transcript and append run metrics to .adlc/run-metrics.json.
 *
 * Extracts per-run token breakdown, per-tool use counts / tokens / duration,
 * individual tool call details, model info, and wall time from the JSONL
 * transcript written by Claude Code. Recomputes totals on each write.
 *
 * Per-run detail files are written to .adlc/run-details/ and linked from
 * the main metrics file.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Types ─────────────────────────────────────────────────

interface ToolStats {
    count: number;
    tokens: number;
    durationMs: number;
}

interface ToolCallRecord {
    id: string | null;
    name: string;
    input: Record<string, unknown>;
    dispatchedAt: string | null;
    completedAt: string | null;
    durationMs: number;
    tokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    billableTokens: number;
    conversationTokens: number;
}

interface ParsedTranscript {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
    conversationTokens: number;
    billableTokens: number;
    tools: Record<string, ToolStats>;
    toolCalls: ToolCallRecord[];
    totalToolUses: number;
    model: string | null;
    durationMs: number;
    firstTimestamp: string | null;
    lastTimestamp: string | null;
}

interface RunTokens {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
    conversationTokens: number;
    billableTokens: number;
}

interface RunEntry {
    agent: string;
    model: string | null;
    slice: string | null;
    mode: string | null;
    tokens: RunTokens;
    tools: Record<string, ToolStats>;
    totalToolUses: number;
    detailsFile: string;
    durationMs: number;
    duration: string;
    startedAt: string | null;
    completedAt: string | null;
}

interface ReworkStats {
    cycles: number;
    slices: string[];
    durationMs: number;
    billableTokens: number;
}

interface Totals {
    tokens: { input: number; output: number; cacheRead: number; cacheCreation: number; billableTokens: number };
    tools: Record<string, ToolStats>;
    totalToolUses: number;
    durationMs: number;
    duration: string;
    rework: ReworkStats;
}

interface Metrics {
    runs: RunEntry[];
    totals: Totals | null;
}

// ── Metrics directory ──────────────────────────────────────

/**
 * Resolve the persistent metrics directory for this run.
 * On first call, bootstraps `.adlc-logs/{timestamp}_{branch}/` and
 * writes a pointer to `.adlc/metrics-dir`. Subsequent calls read the pointer.
 */
function resolveMetricsDir(cwd: string): string {
    const pointerPath = resolve(cwd, ".adlc", "metrics-dir");
    try {
        const dir = readFileSync(pointerPath, "utf8").trim();
        if (existsSync(dir)) {
            return dir;
        }
    } catch {
        // Missing pointer — bootstrap below.
    }

    const head = readFileSync(resolve(cwd, ".git", "HEAD"), "utf8").trim();
    const branch = head.startsWith("ref: refs/heads/") ? head.slice(16) : head.slice(0, 8);
    const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\.\d+Z$/, "");
    const folderName = `${timestamp}_${branch.replace(/\//g, "-")}`;
    const metricsDir = resolve(cwd, ".adlc-logs", folderName);

    for (const sub of ["run-details", "slices", "challenges", "verification-results"]) {
        mkdirSync(resolve(metricsDir, sub), { recursive: true });
    }

    try {
        writeFileSync(pointerPath, metricsDir);
    } catch {
        // .adlc/ may not exist yet — metrics dir still works.
    }

    return metricsDir;
}

// ── Artifact archival ──────────────────────────────────────

/**
 * Copy workflow artifacts to the persistent metrics folder when a gate passes.
 * Called from subagent-stop after a successful (problems-free) agent run.
 */
export function archiveArtifacts(agentType: string, cwd: string): void {
    const metricsDir = resolveMetricsDir(cwd);

    switch (agentType) {
        case "placement-gate":
            if (!existsSync(resolve(cwd, ".adlc", "placement-gate-revision.md"))) {
                copyIfExists(resolve(cwd, ".adlc", "domain-mapping.md"), resolve(metricsDir, "domain-mapping.md"));
                copyDirContents(resolve(cwd, ".adlc", "challenges"), resolve(metricsDir, "challenges"));
            }
            break;
        case "plan-gate":
            if (!existsSync(resolve(cwd, ".adlc", "plan-gate-revision.md"))) {
                copyIfExists(resolve(cwd, ".adlc", "plan-header.md"), resolve(metricsDir, "plan-header.md"));
                copyDirContents(resolve(cwd, ".adlc", "slices"), resolve(metricsDir, "slices"));
            }
            break;
        case "reviewer": {
            const sliceId = detectSlice(cwd);
            if (sliceId) {
                copyIfExists(resolve(cwd, ".adlc", "verification-results.md"), resolve(metricsDir, "verification-results", `${sliceId}.md`));
            }
            break;
        }
    }
}

function copyIfExists(src: string, dest: string): void {
    try {
        copyFileSync(src, dest);
    } catch {
        // Source missing — skip.
    }
}

function copyDirContents(srcDir: string, destDir: string): void {
    let files: string[];
    try {
        files = readdirSync(srcDir);
    } catch {
        return; // Source dir missing.
    }
    for (const file of files) {
        try {
            copyFileSync(resolve(srcDir, file), resolve(destDir, file));
        } catch {
            // Single file failed (e.g. subdirectory) — continue with the rest.
        }
    }
}

/**
 * @param transcriptPath  Absolute path to the agent's .jsonl transcript
 * @param agentType       e.g. "coder"
 * @param cwd             Repo root (where .adlc/ lives)
 */
export function recordMetrics(transcriptPath: string | null, agentType: string, cwd: string): void {
    if (!transcriptPath) {
        return;
    }

    const parsed = parseTranscript(transcriptPath);
    if (!parsed) {
        return;
    }

    const metricsDir = resolveMetricsDir(cwd);
    const metricsPath = resolve(metricsDir, "run-metrics.json");

    let metrics: Metrics;
    try {
        metrics = JSON.parse(readFileSync(metricsPath, "utf8"));
    } catch {
        metrics = { runs: [], totals: null };
    }

    const slice = detectSlice(cwd);
    const mode = detectMode(agentType, slice, metrics.runs);

    // Write detail file
    const runIndex = metrics.runs.length + 1;
    const detailsFile = `run-details/${String(runIndex).padStart(3, "0")}-${agentType}.json`;
    const detailsPath = resolve(metricsDir, detailsFile);

    const detailsDir = resolve(metricsDir, "run-details");
    if (!existsSync(detailsDir)) {
        mkdirSync(detailsDir, { recursive: true });
    }

    writeFileSync(
        detailsPath,
        JSON.stringify(
            {
                agent: agentType,
                model: parsed.model,
                slice,
                mode,
                calls: parsed.toolCalls
            },
            null,
            2
        ) + "\n"
    );

    // Append run entry
    metrics.runs.push({
        agent: agentType,
        model: parsed.model,
        slice,
        mode,
        tokens: {
            input: parsed.inputTokens,
            output: parsed.outputTokens,
            cacheRead: parsed.cacheReadTokens,
            cacheCreation: parsed.cacheCreationTokens,
            conversationTokens: parsed.conversationTokens,
            billableTokens: parsed.billableTokens
        },
        tools: parsed.tools,
        totalToolUses: parsed.totalToolUses,
        detailsFile,
        durationMs: parsed.durationMs,
        duration: formatDuration(parsed.durationMs),
        startedAt: parsed.firstTimestamp,
        completedAt: parsed.lastTimestamp
    });

    metrics.totals = computeTotals(metrics.runs);

    writeFileSync(metricsPath, JSON.stringify(metrics, null, 2) + "\n");
}

// ── Slice & mode detection ─────────────────────────────────

/** Read .adlc/current-slice.md frontmatter to get the active slice ID. */
function detectSlice(cwd: string): string | null {
    const slicePath = resolve(cwd, ".adlc", "current-slice.md");
    try {
        const content = readFileSync(slicePath, "utf8");
        const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (!fmMatch) {
            return null;
        }
        const idMatch = fmMatch[1].match(/^id:\s*(.+)$/m);
        return idMatch ? idMatch[1].trim() : null;
    } catch {
        return null;
    }
}

/**
 * Infer mode from prior runs. Agents that support draft/revision modes
 * (coder, planner, domain-mapper) are "draft" on their
 * first run for a given slice (or globally for planners/mappers) and
 * "revision" on subsequent runs.
 */
function detectMode(agentType: string, sliceId: string | null, existingRuns: RunEntry[]): string | null {
    const modedAgents = ["coder", "planner", "domain-mapper"];
    if (!modedAgents.includes(agentType)) {
        return null;
    }

    const priorRuns = existingRuns.filter(r => r.agent === agentType && r.slice === sliceId);

    return priorRuns.length === 0 ? "draft" : "revision";
}

// ── Transcript parser ───────────────────────────────────────

interface TranscriptEntry {
    type?: string;
    timestamp?: string;
    message?: {
        model?: string;
        role?: string;
        content?: TranscriptContentBlock[] | string;
        usage?: {
            input_tokens?: number;
            output_tokens?: number;
            cache_read_input_tokens?: number;
            cache_creation_input_tokens?: number;
        };
    };
}

interface TranscriptContentBlock {
    type: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string;
    text?: string;
}

function parseTranscript(transcriptPath: string): ParsedTranscript | null {
    let raw: string;
    try {
        raw = readFileSync(transcriptPath, "utf8");
    } catch {
        return null;
    }

    const lines = raw.trim().split("\n");

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;

    const toolCounts: Record<string, number> = {};
    const toolTokens: Record<string, number> = {};
    const toolDurations: Record<string, number> = {};

    // Individual tool call records for the detail file
    const toolCalls: ToolCallRecord[] = [];
    // Map tool_use id → index in toolCalls for completion matching
    const pendingById: Record<string, number> = {};

    let model: string | null = null;
    let lastTurnInputSide = 0;
    let firstTimestamp: string | null = null;
    let lastTimestamp: string | null = null;

    for (const line of lines) {
        let entry: TranscriptEntry;
        try {
            entry = JSON.parse(line);
        } catch {
            continue;
        }

        // Track timestamps for wall time
        if (entry.timestamp) {
            if (!firstTimestamp) {
                firstTimestamp = entry.timestamp;
            }
            lastTimestamp = entry.timestamp;
        }

        const content = entry.message?.content;

        if (entry.type === "assistant") {
            // Extract model from first assistant message
            if (!model && entry.message?.model) {
                model = entry.message.model;
            }

            const usage = entry.message?.usage;
            if (usage) {
                inputTokens += usage.input_tokens || 0;
                outputTokens += usage.output_tokens || 0;
                cacheReadTokens += usage.cache_read_input_tokens || 0;
                cacheCreationTokens += usage.cache_creation_input_tokens || 0;

                // Overwrite on each assistant turn — final value is the conversation size
                lastTurnInputSide = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
            }

            // Count tool uses and attribute tokens proportionally
            if (Array.isArray(content)) {
                const toolUseBlocks = content.filter(b => b.type === "tool_use");

                if (toolUseBlocks.length > 0) {
                    const turnInput = usage?.input_tokens || 0;
                    const turnOutput = usage?.output_tokens || 0;
                    const turnCacheRead = usage?.cache_read_input_tokens || 0;
                    const turnCacheCreation = usage?.cache_creation_input_tokens || 0;
                    const turnTotal = turnInput + turnOutput + turnCacheRead + turnCacheCreation;
                    const n = toolUseBlocks.length;

                    for (const block of toolUseBlocks) {
                        const name = block.name || "unknown";
                        const perToolTokens = Math.round(turnTotal / n);

                        // Aggregate stats
                        toolCounts[name] = (toolCounts[name] || 0) + 1;
                        toolTokens[name] = (toolTokens[name] || 0) + perToolTokens;

                        // Individual call record
                        const perCacheRead = Math.round(turnCacheRead / n);
                        const perCacheCreation = Math.round(turnCacheCreation / n);
                        const callRecord: ToolCallRecord = {
                            id: block.id || null,
                            name,
                            input: block.input || {},
                            dispatchedAt: entry.timestamp || null,
                            completedAt: null,
                            durationMs: 0,
                            tokens: perToolTokens,
                            cacheReadTokens: perCacheRead,
                            cacheCreationTokens: perCacheCreation,
                            billableTokens: computeBillable(Math.round(turnInput / n), Math.round(turnOutput / n), perCacheRead, perCacheCreation),
                            conversationTokens: lastTurnInputSide
                        };
                        toolCalls.push(callRecord);

                        if (block.id && entry.timestamp) {
                            pendingById[block.id] = toolCalls.length - 1;
                        }
                    }
                }
            }
        }

        // Match tool results for duration tracking
        if (entry.type === "user" && Array.isArray(content) && entry.timestamp) {
            for (const block of content) {
                if (block.type === "tool_result" && block.tool_use_id) {
                    const idx = pendingById[block.tool_use_id];
                    if (idx !== undefined) {
                        const call = toolCalls[idx];
                        const duration = new Date(entry.timestamp).getTime() - new Date(call.dispatchedAt!).getTime();
                        if (duration >= 0) {
                            call.completedAt = entry.timestamp;
                            call.durationMs = duration;
                            const name = call.name;
                            toolDurations[name] = (toolDurations[name] || 0) + duration;
                        }
                        delete pendingById[block.tool_use_id];
                    }
                }
            }
        }
    }

    // Build tools map
    const tools: Record<string, ToolStats> = {};
    for (const name of Object.keys(toolCounts)) {
        tools[name] = {
            count: toolCounts[name],
            tokens: toolTokens[name] || 0,
            durationMs: toolDurations[name] || 0
        };
    }

    const billableTokens = computeBillable(inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens);
    const totalToolUses = Object.values(toolCounts).reduce((sum, c) => sum + c, 0);
    const durationMs = firstTimestamp && lastTimestamp ? new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime() : 0;

    return {
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        conversationTokens: lastTurnInputSide,
        billableTokens,
        tools,
        toolCalls,
        totalToolUses,
        model,
        durationMs,
        firstTimestamp,
        lastTimestamp
    };
}

// ── Totals ──────────────────────────────────────────────────

function computeTotals(runs: RunEntry[]): Totals {
    const tokens = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, billableTokens: 0 };
    const tools: Record<string, ToolStats> = {};
    let totalToolUses = 0;
    let durationMs = 0;

    for (const run of runs) {
        tokens.input += run.tokens.input;
        tokens.output += run.tokens.output;
        tokens.cacheRead += run.tokens.cacheRead;
        tokens.cacheCreation += run.tokens.cacheCreation;
        tokens.billableTokens += run.tokens.billableTokens;

        for (const [name, data] of Object.entries(run.tools)) {
            if (!tools[name]) {
                tools[name] = { count: 0, tokens: 0, durationMs: 0 };
            }
            tools[name].count += data.count;
            tools[name].tokens += data.tokens;
            tools[name].durationMs += data.durationMs;
        }
        totalToolUses += run.totalToolUses;
        durationMs += run.durationMs;
    }

    return {
        tokens,
        tools,
        totalToolUses,
        durationMs,
        duration: formatDuration(durationMs),
        rework: computeRework(runs)
    };
}

function computeRework(runs: RunEntry[]): ReworkStats {
    const revisionRuns = runs.filter(r => r.mode === "revision");
    if (revisionRuns.length === 0) {
        return { cycles: 0, slices: [], durationMs: 0, billableTokens: 0 };
    }

    // A rework cycle = the revision coder + the reviewer that follows it for the same slice.
    // Collect all runs (any agent type) tagged as revision, plus the reviewer that
    // immediately follows each revision coder for the same slice.
    const reworkSlices = [...new Set(revisionRuns.map(r => r.slice).filter((s): s is string => s !== null))];

    let reworkDuration = 0;
    let reworkTokens = 0;
    for (let i = 0; i < runs.length; i++) {
        const run = runs[i];
        if (run.mode !== "revision") {
            continue;
        }
        reworkDuration += run.durationMs;
        reworkTokens += run.tokens.billableTokens;

        // Include the re-review that follows this revision coder
        const next = runs[i + 1];
        if (next && next.agent === "reviewer" && next.slice === run.slice) {
            reworkDuration += next.durationMs;
            reworkTokens += next.tokens.billableTokens;
        }
    }

    return {
        cycles: revisionRuns.length,
        slices: reworkSlices,
        durationMs: reworkDuration,
        billableTokens: reworkTokens
    };
}

// ── Billing ─────────────────────────────────────────────────

// Weighted cost in input-token equivalents. Ratios are consistent across
// Claude model tiers: cache read = 0.1×, cache creation = 1.25×, output = 5×.
function computeBillable(input: number, output: number, cacheRead: number, cacheCreation: number): number {
    return Math.round(input + output * 5 + cacheRead * 0.1 + cacheCreation * 1.25);
}

// ── Formatting ──────────────────────────────────────────────

function formatDuration(ms: number): string {
    if (ms <= 0) {
        return "—";
    }
    const totalSec = Math.round(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}
