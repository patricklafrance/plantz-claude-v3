import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

// ── Mock SDK ────────────────────────────────────────────────────────────────

type MockMessage = { type: "result"; subtype: "success"; result: string; session_id: string };

let queryCallLog: { prompt: string; options: Record<string, unknown> }[] = [];
let verdictContent: string;
let tmp: string;

function createMockConversation(result: string): AsyncGenerator<MockMessage, void> {
    return (async function* () {
        yield {
            type: "result" as const,
            subtype: "success" as const,
            result,
            session_id: "mock-session-id"
        };
    })();
}

function defaultQueryMock(params: { prompt: string | unknown; options?: Record<string, unknown> }) {
    queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
    const agentName = (params.options?.agent as string) ?? "unknown";

    // Simulate the domain-challenger team writing the verdict file
    if (agentName === "domain-challenger") {
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
        writeFileSync(join(tmp, ".adlc", "current-challenge-verdict.md"), verdictContent);
    }

    return createMockConversation("");
}

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
    query: vi.fn<any>(defaultQueryMock)
}));

// ── Import under test ───────────────────────────────────────────────────────

import { runPlan } from "../../../src/workflow/steps/plan.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function agentCallOrder(): string[] {
    return queryCallLog.map(call => call.options.agent as string);
}

const mockAgents = {
    planner: { description: "mock", prompt: "mock" },
    "plan-gate": { description: "mock", prompt: "mock" },
    "domain-challenger": { description: "mock", prompt: "mock" }
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runPlan", () => {
    beforeEach(async () => {
        queryCallLog = [];
        tmp = mkdtempSync(join(tmpdir(), "adlc-plan-"));
        verdictContent = "# Challenge Verdict\n\n## Status\n\nApproved";
        // Vitest 4 no longer restores vi.fn() factory mocks via vi.restoreAllMocks(),
        // so re-apply the default implementation before each test.
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("runs full pipeline when approved on first attempt", async () => {
        await runPlan("Add plant watering feature", tmp, mockAgents);

        const order = agentCallOrder();

        // Each pipeline step runs exactly once
        expect(order.filter(a => a === "planner")).toHaveLength(1);
        expect(order.filter(a => a === "plan-gate")).toHaveLength(1);
        expect(order.filter(a => a === "domain-challenger")).toHaveLength(1);

        // Pipeline ordering: planner → plan-gate → domain-challenger
        expect(order.indexOf("planner")).toBeLessThan(order.indexOf("plan-gate"));
        expect(order.indexOf("plan-gate")).toBeLessThan(order.indexOf("domain-challenger"));
    });

    it("retries planner when verdict requires revision", async () => {
        let challengerCallCount = 0;
        const { query: mockQuery } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(mockQuery).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
            const agentName = (params.options?.agent as string) ?? "unknown";

            if (agentName === "domain-challenger") {
                challengerCallCount++;
                mkdirSync(join(tmp, ".adlc"), { recursive: true });
                const content = challengerCallCount === 1
                    ? "# Challenge Verdict\n\n## Status\n\nRevision required — sprawl risk in slice 3."
                    : "# Challenge Verdict\n\n## Status\n\nApproved after revision.";
                writeFileSync(join(tmp, ".adlc", "current-challenge-verdict.md"), content);
            }
            return createMockConversation("");
        }) as any);

        await runPlan("Add watering", tmp, mockAgents);

        const order = agentCallOrder();
        const plannerCalls = order.filter(a => a === "planner");
        const challengerCalls = order.filter(a => a === "domain-challenger");

        expect(plannerCalls).toHaveLength(2);
        expect(challengerCalls).toHaveLength(2);
    });

    it("respects max plan attempts", async () => {
        verdictContent = "# Challenge Verdict\n\n## Status\n\nRevision required — always reject.";

        await runPlan("Feature", tmp, mockAgents);

        const order = agentCallOrder();
        const plannerCalls = order.filter(a => a === "planner");
        const challengerCalls = order.filter(a => a === "domain-challenger");

        expect(plannerCalls).toHaveLength(5);
        expect(challengerCalls).toHaveLength(5);
    });

    it("passes feature description to planner", async () => {
        await runPlan("Add plant watering schedule", tmp, mockAgents);

        const plannerCall = queryCallLog.find(c => (c.options.agent as string) === "planner");
        expect(plannerCall?.prompt).toContain("Add plant watering schedule");
    });

    it("forwards hooks to every agent call", async () => {
        // eslint-disable-next-line vitest/require-mock-type-parameters -- complex SDK hook signature
        const fakeHooks = { SubagentStop: [{ hooks: [vi.fn()] }] };

        await runPlan("Add watering", tmp, mockAgents, undefined, fakeHooks);

        expect(queryCallLog.length).toBeGreaterThan(0);
        for (const call of queryCallLog) {
            expect(call.options.hooks).toBe(fakeHooks);
        }
    });
});
