import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock SDK ────────────────────────────────────────────────────────────────

type MockMessage = { type: "result"; subtype: "success"; result: string; session_id: string };

let queryCallLog: { prompt: string; options: Record<string, unknown> }[] = [];
let agentResultMap: Record<string, string> = {};

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
    const result = agentResultMap[agentName] ?? "";
    return createMockConversation(result);
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
    "cohesion-challenger": { description: "mock", prompt: "mock" },
    "sprawl-challenger": { description: "mock", prompt: "mock" },
    "challenge-arbiter": { description: "mock", prompt: "mock" }
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runPlan", () => {
    beforeEach(async () => {
        queryCallLog = [];
        agentResultMap = {};
        // Vitest 4 no longer restores vi.fn() factory mocks via vi.restoreAllMocks(),
        // so re-apply the default implementation before each test.
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    it("runs full pipeline when approved on first attempt", async () => {
        agentResultMap["challenge-arbiter"] = "Plan approved. No changes needed.";

        await runPlan("Add plant watering feature", "/tmp/test", mockAgents);

        const order = agentCallOrder();

        // Each pipeline step runs exactly once
        expect(order.filter(a => a === "planner")).toHaveLength(1);
        expect(order.filter(a => a === "plan-gate")).toHaveLength(1);
        expect(order.filter(a => a === "cohesion-challenger")).toHaveLength(1);
        expect(order.filter(a => a === "sprawl-challenger")).toHaveLength(1);
        expect(order.filter(a => a === "challenge-arbiter")).toHaveLength(1);

        // Pipeline ordering: planner → plan-gate → challengers → arbiter
        expect(order.indexOf("planner")).toBeLessThan(order.indexOf("plan-gate"));
        expect(order.indexOf("plan-gate")).toBeLessThan(order.indexOf("cohesion-challenger"));
        expect(order.indexOf("plan-gate")).toBeLessThan(order.indexOf("sprawl-challenger"));
        expect(order.indexOf("cohesion-challenger")).toBeLessThan(order.indexOf("challenge-arbiter"));
        expect(order.indexOf("sprawl-challenger")).toBeLessThan(order.indexOf("challenge-arbiter"));
    });

    it("retries planner when arbiter does not approve", async () => {
        let arbiterCallCount = 0;
        const { query: mockQuery } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(mockQuery).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
            const agentName = (params.options?.agent as string) ?? "unknown";

            if (agentName === "challenge-arbiter") {
                arbiterCallCount++;
                const result = arbiterCallCount === 1 ? "Rejected: sprawl risk in slice 3." : "Plan approved after revision.";
                return createMockConversation(result);
            }
            return createMockConversation("");
        }) as any);

        await runPlan("Add watering", "/tmp/test", mockAgents);

        const order = agentCallOrder();
        const plannerCalls = order.filter(a => a === "planner");
        const arbiterCalls = order.filter(a => a === "challenge-arbiter");

        expect(plannerCalls).toHaveLength(2);
        expect(arbiterCalls).toHaveLength(2);
    });

    it("respects max plan attempts", async () => {
        agentResultMap["challenge-arbiter"] = "Rejected.";

        await runPlan("Feature", "/tmp/test", mockAgents);

        const order = agentCallOrder();
        const plannerCalls = order.filter(a => a === "planner");
        const arbiterCalls = order.filter(a => a === "challenge-arbiter");

        expect(plannerCalls).toHaveLength(5);
        expect(arbiterCalls).toHaveLength(5);
    });

    it("passes feature description to planner", async () => {
        agentResultMap["challenge-arbiter"] = "Plan approved.";

        await runPlan("Add plant watering schedule", "/tmp/test", mockAgents);

        const plannerCall = queryCallLog.find(c => (c.options.agent as string) === "planner");
        expect(plannerCall?.prompt).toContain("Add plant watering schedule");
    });

    it("forwards hooks to every agent call", async () => {
        agentResultMap["challenge-arbiter"] = "Plan approved.";
        // eslint-disable-next-line vitest/require-mock-type-parameters -- complex SDK hook signature
        const fakeHooks = { SubagentStop: [{ hooks: [vi.fn()] }] };

        await runPlan("Add watering", "/tmp/test", mockAgents, undefined, fakeHooks);

        expect(queryCallLog.length).toBeGreaterThan(0);
        for (const call of queryCallLog) {
            expect(call.options.hooks).toBe(fakeHooks);
        }
    });
});
