import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock SDK ────────────────────────────────────────────────────────────────

type MockMessage = { type: "result"; subtype: "success"; result: string; session_id: string };

let queryCallLog: { prompt: string; agentName: string; options: Record<string, unknown> }[] = [];
let sessionCounter = 0;

function createMockConversation(sessionId: string): AsyncGenerator<MockMessage, void> {
    return (async function* () {
        yield {
            type: "result" as const,
            subtype: "success" as const,
            result: "",
            session_id: sessionId
        };
    })();
}

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
    query: vi.fn<any>((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
        const agentName = (params.options?.agent as string) ?? "unknown";
        queryCallLog.push({ prompt: params.prompt as string, agentName, options: params.options ?? {} });
        sessionCounter++;
        return createMockConversation(`session-${sessionCounter}`);
    })
}));

vi.mock("../../../../src/workflow/agents.js", () => ({
    loadAllAgents: vi.fn<any>(() => ({
        explorer: { description: "mock", prompt: "mock" },
        coder: { description: "mock", prompt: "mock" },
        reviewer: { description: "mock", prompt: "mock" }
    }))
}));

const mockHooksSentinel = { SubagentStop: [{ hooks: ["mock-hook-sentinel"] }] };

vi.mock("../../../../src/hooks/create-hooks.js", () => ({
    createHooks: vi.fn<any>(() => ({
        hooks: mockHooksSentinel
    }))
}));

// ── Import under test ───────────────────────────────────────────────────────

import { resolveConfig } from "../../../../src/config.js";
import type { Ports } from "../../../../src/ports.js";
import { runSlicePipeline, checkVerificationResults } from "../../../../src/workflow/steps/slices/revision-loop.js";

// ── Tests ───────────────────────────────────────────────────────────────────

const defaultPorts: Ports = { storybook: 6100, hostApp: 8100, browser: 9200 };
const defaultConfig = resolveConfig({});
const defaultPreamble = "";

describe("checkVerificationResults", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = mkdtempSync(join(tmpdir(), "rev-loop-test-"));
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("returns false when verification-results.md does not exist", () => {
        expect(checkVerificationResults(tmpDir)).toBe(false);
    });

    it("returns true when results contain only passing criteria", () => {
        mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
        writeFileSync(
            join(tmpDir, ".adlc/verification-results.md"),
            "# Results\n\n- [x] Passed: renders plant list\n- [x] Passed: navigation works\n"
        );
        expect(checkVerificationResults(tmpDir)).toBe(true);
    });

    it("returns false when results contain 'failed'", () => {
        mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
        writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [x] Passed: renders list\n- [ ] Failed: validation broken\n");
        expect(checkVerificationResults(tmpDir)).toBe(false);
    });

    it("returns false when results contain 'fail' (case-insensitive)", () => {
        mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
        writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [ ] FAIL: tests do not compile\n");
        expect(checkVerificationResults(tmpDir)).toBe(false);
    });
});

describe("runSlicePipeline", () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = mkdtempSync(join(tmpdir(), "rev-loop-test-"));
        queryCallLog = [];
        sessionCounter = 0;
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
        vi.clearAllMocks();
    });

    it("returns success when reviewer passes on first attempt", async () => {
        mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
        writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [x] Passed: all good\n");

        const result = await runSlicePipeline("plant-list", tmpDir, defaultPorts, defaultPreamble, defaultConfig, tmpDir);

        expect(result.success).toBe(true);

        const agents = queryCallLog.map(c => c.agentName);
        expect(agents[0]).toBe("explorer");
        expect(agents[1]).toBe("coder");
        expect(agents[2]).toBe("reviewer");
        expect(agents).toHaveLength(3);
    });

    it("retries when reviewer fails and succeeds on second attempt", async () => {
        let reviewerCallCount = 0;

        const { query: mockQuery } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(mockQuery).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            const agentName = (params.options?.agent as string) ?? "unknown";
            queryCallLog.push({ prompt: params.prompt as string, agentName, options: params.options ?? {} });
            sessionCounter++;

            if (agentName === "reviewer") {
                reviewerCallCount++;
                if (reviewerCallCount === 1) {
                    mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
                    writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [ ] Failed: tests broken\n");
                } else {
                    writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [x] Passed: tests fixed\n");
                }
            }

            return createMockConversation(`session-${sessionCounter}`);
        }) as any);

        const result = await runSlicePipeline("plant-list", tmpDir, defaultPorts, defaultPreamble, defaultConfig, tmpDir);

        expect(result.success).toBe(true);

        const agents = queryCallLog.map(c => c.agentName);
        expect(agents[0]).toBe("explorer");
        expect(agents[1]).toBe("coder");
        expect(agents[2]).toBe("reviewer");
        expect(agents[3]).toBe("coder");
        expect(agents[4]).toBe("reviewer");
    });

    it("returns failure after max revision attempts", async () => {
        const { query: mockQuery } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(mockQuery).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            const agentName = (params.options?.agent as string) ?? "unknown";
            queryCallLog.push({ prompt: params.prompt as string, agentName, options: params.options ?? {} });
            sessionCounter++;

            if (agentName === "reviewer") {
                mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
                writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [ ] Failed: still broken\n");
            }

            return createMockConversation(`session-${sessionCounter}`);
        }) as any);

        const result = await runSlicePipeline("plant-list", tmpDir, defaultPorts, defaultPreamble, defaultConfig, tmpDir);

        expect(result.success).toBe(false);
        expect(result.reason).toBe("max revision attempts exceeded");

        const agents = queryCallLog.map(c => c.agentName);
        expect(agents).toHaveLength(11);
        expect(agents.filter(a => a === "coder")).toHaveLength(5);
        expect(agents.filter(a => a === "reviewer")).toHaveLength(5);
    });

    it("always starts with the explorer phase", async () => {
        mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
        writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [x] Passed: fine\n");

        await runSlicePipeline("plant-list", tmpDir, defaultPorts, defaultPreamble, defaultConfig, tmpDir);

        expect(queryCallLog[0].agentName).toBe("explorer");
    });

    it("resumes the coder session on revision attempts", async () => {
        let reviewerCallCount = 0;

        const { query: mockQuery } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(mockQuery).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            const agentName = (params.options?.agent as string) ?? "unknown";
            queryCallLog.push({ prompt: params.prompt as string, agentName, options: params.options ?? {} });
            sessionCounter++;

            if (agentName === "reviewer") {
                reviewerCallCount++;
                mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
                if (reviewerCallCount < 2) {
                    writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [ ] Failed: issues\n");
                } else {
                    writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [x] Passed: done\n");
                }
            }

            return createMockConversation(`session-${sessionCounter}`);
        }) as any);

        await runSlicePipeline("plant-list", tmpDir, defaultPorts, defaultPreamble, defaultConfig, tmpDir);

        const coderCalls = queryCallLog.map((c, i) => Object.assign({}, c, { index: i })).filter(c => c.agentName === "coder");

        expect(coderCalls).toHaveLength(2);
        expect(coderCalls[0].prompt).toContain("Implement slice");
        expect(coderCalls[1].prompt).toContain("Apply the reviewer feedback");
    });

    it("forwards hooks from createHooks to every SDK query call", async () => {
        mkdirSync(join(tmpDir, ".adlc"), { recursive: true });
        writeFileSync(join(tmpDir, ".adlc/verification-results.md"), "# Results\n\n- [x] Passed: all good\n");

        await runSlicePipeline("plant-list", tmpDir, defaultPorts, defaultPreamble, defaultConfig, tmpDir);

        expect(queryCallLog.length).toBeGreaterThan(0);
        for (const call of queryCallLog) {
            expect(call.options.hooks).toBe(mockHooksSentinel);
        }
    });
});
