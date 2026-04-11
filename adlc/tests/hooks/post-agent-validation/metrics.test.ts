import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { recordMetrics } from "../../../src/hooks/post-agent-validation/metrics.js";

function makeTmpDir(): string {
    const dir = mkdtempSync(join(tmpdir(), "metrics-test-"));
    mkdirSync(join(dir, ".adlc"));
    mkdirSync(join(dir, ".git"), { recursive: true });
    writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
    return dir;
}

function makeTranscript(lines: Record<string, unknown>[]): { path: string; cleanup: () => void } {
    const tmp = mkdtempSync(join(tmpdir(), "transcript-"));
    const path = join(tmp, "agent.jsonl");
    writeFileSync(path, lines.map(l => JSON.stringify(l)).join("\n"));
    return { path, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}

function resolveMetricsDir(cwd: string): string {
    const pointer = readFileSync(join(cwd, ".adlc", "metrics-dir"), "utf8").trim();
    return pointer;
}

function readMetrics(cwd: string): Record<string, unknown> {
    return JSON.parse(readFileSync(join(resolveMetricsDir(cwd), "run-metrics.json"), "utf8"));
}

function readDetails(cwd: string, file: string): Record<string, unknown> {
    return JSON.parse(readFileSync(join(resolveMetricsDir(cwd), file), "utf8"));
}

describe("run-metrics", () => {
    let cwd: string;

    beforeEach(() => {
        cwd = makeTmpDir();
    });

    afterEach(() => {
        rmSync(cwd, { recursive: true, force: true });
    });

    it("should create run-metrics.json with per-tool breakdown, model, and detail file", () => {
        const transcript = makeTranscript([
            { type: "user", timestamp: "2026-03-25T10:00:00.000Z", message: { role: "user", content: "hello" } },
            {
                type: "assistant",
                timestamp: "2026-03-25T10:00:05.000Z",
                message: {
                    model: "claude-sonnet-4-20250514",
                    content: [{ type: "tool_use", id: "t1", name: "Read", input: { file_path: "/src/app.ts" } }],
                    usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 200, cache_creation_input_tokens: 80 }
                }
            },
            {
                type: "user",
                timestamp: "2026-03-25T10:00:06.000Z",
                message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "file contents" }] }
            },
            {
                type: "assistant",
                timestamp: "2026-03-25T10:01:30.000Z",
                message: {
                    model: "claude-sonnet-4-20250514",
                    content: [
                        { type: "tool_use", id: "t2", name: "Edit", input: { file_path: "/src/app.ts", old_string: "a", new_string: "b" } },
                        { type: "tool_use", id: "t3", name: "Read", input: { file_path: "/src/utils.ts" } }
                    ],
                    usage: { input_tokens: 120, output_tokens: 60, cache_read_input_tokens: 200, cache_creation_input_tokens: 0 }
                }
            },
            {
                type: "user",
                timestamp: "2026-03-25T10:01:32.000Z",
                message: {
                    content: [
                        { type: "tool_result", tool_use_id: "t2", content: "ok" },
                        { type: "tool_result", tool_use_id: "t3", content: "file contents" }
                    ]
                }
            },
            {
                type: "assistant",
                timestamp: "2026-03-25T10:02:00.000Z",
                message: {
                    model: "claude-sonnet-4-20250514",
                    content: [{ type: "text", text: "done" }],
                    usage: { input_tokens: 80, output_tokens: 30, cache_read_input_tokens: 100, cache_creation_input_tokens: 0 }
                }
            }
        ]);

        recordMetrics(transcript.path, "coder", cwd);
        transcript.cleanup();

        const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
        const run = metrics.runs[0] as Record<string, unknown>;

        // Model
        expect(run.model).toBe("claude-sonnet-4-20250514");

        // Conversation tokens: last turn's input side = 80 + 100 + 0 = 180
        expect((run.tokens as Record<string, unknown>).conversationTokens).toBe(180);
        // Billable: input(300) + output(140×5) + cacheRead(500×0.1) + cacheCreation(80×1.25)
        //         = 300 + 700 + 50 + 100 = 1150
        expect((run.tokens as Record<string, unknown>).billableTokens).toBe(1150);

        // Per-tool breakdown
        expect((run.tools as Record<string, unknown>).Read).toEqual({ count: 2, tokens: 620, durationMs: 3000 });
        expect((run.tools as Record<string, unknown>).Edit).toEqual({ count: 1, tokens: 190, durationMs: 2000 });

        // Detail file link
        expect(run.detailsFile).toBe("run-details/001-coder.json");

        // Detail file contents
        const details = readDetails(cwd, run.detailsFile as string) as { agent: string; model: string; calls: Record<string, unknown>[] };
        expect(details.agent).toBe("coder");
        expect(details.model).toBe("claude-sonnet-4-20250514");
        expect(details.calls).toHaveLength(3);

        // First call: Read /src/app.ts (turn 1: 1 tool, 430 context tokens)
        expect(details.calls[0].name).toBe("Read");
        expect(details.calls[0].input).toEqual({ file_path: "/src/app.ts" });
        expect(details.calls[0].durationMs).toBe(1000);
        expect(details.calls[0].tokens).toBe(430);
        expect(details.calls[0].cacheReadTokens).toBe(200);
        expect(details.calls[0].cacheCreationTokens).toBe(80);
        // billable: input(100) + output(50×5) + cacheRead(200×0.1) + cacheCreation(80×1.25) = 100+250+20+100 = 470
        expect(details.calls[0].billableTokens).toBe(470);
        // conversationTokens at turn 1: input(100) + cacheRead(200) + cacheCreation(80) = 380
        expect(details.calls[0].conversationTokens).toBe(380);

        // Second call: Edit (turn 2: shared with Read, split 2 ways)
        expect(details.calls[1].name).toBe("Edit");
        expect(details.calls[1].input).toEqual({ file_path: "/src/app.ts", old_string: "a", new_string: "b" });
        expect(details.calls[1].tokens).toBe(190);
        expect(details.calls[1].cacheReadTokens).toBe(100);
        expect(details.calls[1].cacheCreationTokens).toBe(0);
        // billable: input(60) + output(30×5) + cacheRead(100×0.1) + cacheCreation(0) = 60+150+10+0 = 220
        expect(details.calls[1].billableTokens).toBe(220);
        // conversationTokens at turn 2: input(120) + cacheRead(200) + cacheCreation(0) = 320
        expect(details.calls[1].conversationTokens).toBe(320);

        // Third call: Read /src/utils.ts (same turn 2, same conversationTokens)
        expect(details.calls[2].name).toBe("Read");
        expect(details.calls[2].conversationTokens).toBe(320);
        expect(details.calls[2].input).toEqual({ file_path: "/src/utils.ts" });
    });

    it("should number detail files sequentially across runs", () => {
        const t1 = makeTranscript([
            { type: "user", timestamp: "2026-03-25T10:00:00.000Z", message: {} },
            {
                type: "assistant",
                timestamp: "2026-03-25T10:00:30.000Z",
                message: {
                    model: "claude-sonnet-4-20250514",
                    usage: { input_tokens: 50, output_tokens: 20 },
                    content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "pnpm test" } }]
                }
            }
        ]);
        const t2 = makeTranscript([
            { type: "user", timestamp: "2026-03-25T11:00:00.000Z", message: {} },
            {
                type: "assistant",
                timestamp: "2026-03-25T11:05:00.000Z",
                message: {
                    model: "claude-opus-4-6",
                    usage: { input_tokens: 1000, output_tokens: 500 },
                    content: [{ type: "tool_use", id: "t1", name: "Read", input: { file_path: "/a.ts" } }]
                }
            }
        ]);

        recordMetrics(t1.path, "planner", cwd);
        recordMetrics(t2.path, "coder", cwd);
        t1.cleanup();
        t2.cleanup();

        const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };

        expect((metrics.runs[0] as Record<string, unknown>).detailsFile).toBe("run-details/001-planner.json");
        expect((metrics.runs[1] as Record<string, unknown>).detailsFile).toBe("run-details/002-coder.json");
        expect((metrics.runs[0] as Record<string, unknown>).model).toBe("claude-sonnet-4-20250514");
        expect((metrics.runs[1] as Record<string, unknown>).model).toBe("claude-opus-4-6");

        // Both detail files exist
        const mDir = resolveMetricsDir(cwd);
        expect(existsSync(join(mDir, "run-details", "001-planner.json"))).toBe(true);
        expect(existsSync(join(mDir, "run-details", "002-coder.json"))).toBe(true);

        // Detail file has tool call with input
        const d2 = readDetails(cwd, (metrics.runs[1] as Record<string, unknown>).detailsFile as string) as { calls: Record<string, unknown>[] };
        expect(d2.calls[0].input).toEqual({ file_path: "/a.ts" });
    });

    it("should preserve chronological order for resume tracking", () => {
        const coderRun1 = makeTranscript([
            { type: "user", timestamp: "2026-03-25T10:00:00.000Z", message: {} },
            { type: "assistant", timestamp: "2026-03-25T10:10:00.000Z", message: { usage: { input_tokens: 100, output_tokens: 50 }, content: [] } }
        ]);
        const reviewerRun = makeTranscript([
            { type: "user", timestamp: "2026-03-25T10:10:30.000Z", message: {} },
            { type: "assistant", timestamp: "2026-03-25T10:12:00.000Z", message: { usage: { input_tokens: 80, output_tokens: 40 }, content: [] } }
        ]);
        const coderRun2 = makeTranscript([
            { type: "user", timestamp: "2026-03-25T10:12:30.000Z", message: {} },
            { type: "assistant", timestamp: "2026-03-25T10:15:00.000Z", message: { usage: { input_tokens: 60, output_tokens: 30 }, content: [] } }
        ]);

        recordMetrics(coderRun1.path, "coder", cwd);
        recordMetrics(reviewerRun.path, "reviewer", cwd);
        recordMetrics(coderRun2.path, "coder", cwd);
        coderRun1.cleanup();
        reviewerRun.cleanup();
        coderRun2.cleanup();

        const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[]; totals: Record<string, unknown> };

        expect(metrics.runs.map(r => r.agent)).toEqual(["coder", "reviewer", "coder"]);
        expect(metrics.runs.map(r => r.detailsFile)).toEqual([
            "run-details/001-coder.json",
            "run-details/002-reviewer.json",
            "run-details/003-coder.json"
        ]);
        // input: 240, output: 120 → billable: 240 + 120×5 = 840
        expect((metrics.totals.tokens as Record<string, unknown>).billableTokens).toBe(840);
    });

    it("should track tool duration from tool_result timestamps", () => {
        const transcript = makeTranscript([
            { type: "user", timestamp: "2026-03-25T10:00:00.000Z", message: {} },
            {
                type: "assistant",
                timestamp: "2026-03-25T10:00:01.000Z",
                message: {
                    content: [{ type: "tool_use", id: "t1", name: "Bash", input: { command: "pnpm test" } }],
                    usage: { input_tokens: 100, output_tokens: 50 }
                }
            },
            {
                type: "user",
                timestamp: "2026-03-25T10:00:11.000Z",
                message: { content: [{ type: "tool_result", tool_use_id: "t1", content: "test output" }] }
            },
            {
                type: "assistant",
                timestamp: "2026-03-25T10:00:15.000Z",
                message: {
                    content: [{ type: "tool_use", id: "t2", name: "Bash", input: { command: "pnpm lint" } }],
                    usage: { input_tokens: 120, output_tokens: 60 }
                }
            },
            {
                type: "user",
                timestamp: "2026-03-25T10:00:20.000Z",
                message: { content: [{ type: "tool_result", tool_use_id: "t2", content: "lint output" }] }
            }
        ]);

        recordMetrics(transcript.path, "coder", cwd);
        transcript.cleanup();

        const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
        const run = metrics.runs[0] as Record<string, unknown>;

        expect((run.tools as Record<string, Record<string, unknown>>).Bash.count).toBe(2);
        expect((run.tools as Record<string, Record<string, unknown>>).Bash.durationMs).toBe(15000);

        // Detail file has individual durations
        const details = readDetails(cwd, run.detailsFile as string) as { calls: Record<string, unknown>[] };
        expect(details.calls[0].durationMs).toBe(10000);
        expect(details.calls[0].input).toEqual({ command: "pnpm test" });
        expect(details.calls[1].durationMs).toBe(5000);
        expect(details.calls[1].input).toEqual({ command: "pnpm lint" });
    });

    it("should handle model being null when not in transcript", () => {
        const transcript = makeTranscript([
            { type: "user", timestamp: "2026-03-25T10:00:00.000Z", message: {} },
            {
                type: "assistant",
                timestamp: "2026-03-25T10:00:30.000Z",
                message: { usage: { input_tokens: 50, output_tokens: 20 }, content: [] }
            }
        ]);

        recordMetrics(transcript.path, "coder", cwd);
        transcript.cleanup();

        const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
        expect((metrics.runs[0] as Record<string, unknown>).model).toBeNull();
    });

    it("should handle missing transcript gracefully", () => {
        recordMetrics("/nonexistent/path.jsonl", "coder", cwd);
        expect(() => readFileSync(join(cwd, ".adlc", "run-metrics.json"))).toThrow(/ENOENT/);
    });

    it("should handle null transcript path", () => {
        recordMetrics(null, "coder", cwd);
        expect(() => readFileSync(join(cwd, ".adlc", "run-metrics.json"))).toThrow(/ENOENT/);
    });

    describe("slice and mode tracking", () => {
        function writeSlice(dir: string, id: string): void {
            writeFileSync(join(dir, ".adlc", "current-slice.md"), `---\nid: ${id}\n---\n\n# Slice\n`);
        }

        function minimalTranscript(ts = "2026-03-25T10:00:00.000Z"): { path: string; cleanup: () => void } {
            return makeTranscript([
                { type: "user", timestamp: ts, message: {} },
                {
                    type: "assistant",
                    timestamp: ts.replace("00.000", "30.000"),
                    message: { usage: { input_tokens: 50, output_tokens: 20 }, content: [] }
                }
            ]);
        }

        it("should detect slice from current-slice.md frontmatter", () => {
            writeSlice(cwd, "03-share-plants");
            const t = minimalTranscript();
            recordMetrics(t.path, "coder", cwd);
            t.cleanup();

            const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
            expect((metrics.runs[0] as Record<string, unknown>).slice).toBe("03-share-plants");
        });

        it("should set slice to null when current-slice.md does not exist", () => {
            const t = minimalTranscript();
            recordMetrics(t.path, "planner", cwd);
            t.cleanup();

            const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
            expect((metrics.runs[0] as Record<string, unknown>).slice).toBeNull();
        });

        it("should set mode to draft for first coder run on a slice", () => {
            writeSlice(cwd, "01-household");
            const t = minimalTranscript();
            recordMetrics(t.path, "coder", cwd);
            t.cleanup();

            const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
            expect((metrics.runs[0] as Record<string, unknown>).mode).toBe("draft");
        });

        it("should set mode to revision for second coder run on same slice", () => {
            writeSlice(cwd, "03-share-plants");
            const t1 = minimalTranscript("2026-03-25T10:00:00.000Z");
            const t2 = minimalTranscript("2026-03-25T10:10:00.000Z");
            const t3 = minimalTranscript("2026-03-25T10:20:00.000Z");

            recordMetrics(t1.path, "coder", cwd); // draft
            recordMetrics(t2.path, "reviewer", cwd); // no mode
            recordMetrics(t3.path, "coder", cwd); // revision

            t1.cleanup();
            t2.cleanup();
            t3.cleanup();

            const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
            expect((metrics.runs[0] as Record<string, unknown>).mode).toBe("draft");
            expect((metrics.runs[1] as Record<string, unknown>).mode).toBeNull();
            expect((metrics.runs[2] as Record<string, unknown>).mode).toBe("revision");
        });

        it("should set mode to null for non-moded agents", () => {
            writeSlice(cwd, "01-household");
            const t = minimalTranscript();
            recordMetrics(t.path, "reviewer", cwd);
            t.cleanup();

            const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
            expect((metrics.runs[0] as Record<string, unknown>).mode).toBeNull();
        });

        it("should not confuse coder runs across different slices", () => {
            writeSlice(cwd, "01-household");
            const t1 = minimalTranscript("2026-03-25T10:00:00.000Z");
            recordMetrics(t1.path, "coder", cwd);
            t1.cleanup();

            writeSlice(cwd, "02-invitations");
            const t2 = minimalTranscript("2026-03-25T10:30:00.000Z");
            recordMetrics(t2.path, "coder", cwd);
            t2.cleanup();

            const metrics = readMetrics(cwd) as { runs: Record<string, unknown>[] };
            expect(metrics.runs[0]).toMatchObject({ slice: "01-household", mode: "draft" });
            expect(metrics.runs[1]).toMatchObject({ slice: "02-invitations", mode: "draft" });
        });

        it("should include slice and mode in detail files", () => {
            writeSlice(cwd, "05-actor-tracking");
            const t = minimalTranscript();
            recordMetrics(t.path, "coder", cwd);
            t.cleanup();

            const details = readDetails(
                cwd,
                ((readMetrics(cwd) as { runs: Record<string, unknown>[] }).runs[0] as Record<string, unknown>).detailsFile as string
            ) as Record<string, unknown>;
            expect(details.slice).toBe("05-actor-tracking");
            expect(details.mode).toBe("draft");
        });

        it("should compute rework totals in totals.rework", () => {
            writeSlice(cwd, "03-share-plants");
            const t1 = minimalTranscript("2026-03-25T10:00:00.000Z");
            const t2 = minimalTranscript("2026-03-25T10:05:00.000Z");
            const t3 = minimalTranscript("2026-03-25T10:10:00.000Z");
            const t4 = minimalTranscript("2026-03-25T10:20:00.000Z");

            recordMetrics(t1.path, "coder", cwd); // draft
            recordMetrics(t2.path, "reviewer", cwd); // first review
            recordMetrics(t3.path, "coder", cwd); // revision
            recordMetrics(t4.path, "reviewer", cwd); // re-review

            t1.cleanup();
            t2.cleanup();
            t3.cleanup();
            t4.cleanup();

            const metrics = readMetrics(cwd) as { totals: { rework: Record<string, unknown> } };
            expect(metrics.totals.rework.cycles).toBe(1);
            expect(metrics.totals.rework.slices).toEqual(["03-share-plants"]);
            expect(metrics.totals.rework.durationMs).toBeGreaterThan(0);
            expect(metrics.totals.rework.billableTokens).toBeGreaterThan(0);
        });

        it("should report zero rework when no revisions exist", () => {
            writeSlice(cwd, "01-household");
            const t1 = minimalTranscript("2026-03-25T10:00:00.000Z");
            const t2 = minimalTranscript("2026-03-25T10:05:00.000Z");

            recordMetrics(t1.path, "coder", cwd);
            recordMetrics(t2.path, "reviewer", cwd);

            t1.cleanup();
            t2.cleanup();

            const metrics = readMetrics(cwd) as { totals: { rework: Record<string, unknown> } };
            expect(metrics.totals.rework).toEqual({
                cycles: 0,
                slices: [],
                durationMs: 0,
                billableTokens: 0
            });
        });
    });
});
