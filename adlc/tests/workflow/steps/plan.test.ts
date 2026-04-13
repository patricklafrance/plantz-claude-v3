import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock SDK ────────────────────────────────────────────────────────────────

type MockMessage = { type: "result"; subtype: "success"; result: string; session_id: string };

let queryCallLog: { prompt: string; options: Record<string, unknown> }[] = [];

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
    return createMockConversation("");
}

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
    query: vi.fn<any>(defaultQueryMock)
}));

// ── Import under test ───────────────────────────────────────────────────────

import { runPlan } from "../../../src/workflow/steps/plan.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockAgents = {
    "plan-coordinator": { description: "mock", prompt: "mock" }
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runPlan", () => {
    beforeEach(async () => {
        queryCallLog = [];
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    it("delegates to plan-coordinator agent", async () => {
        await runPlan("Add plant watering feature", "/tmp/test", mockAgents);

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options.agent).toBe("plan-coordinator");
    });

    it("passes feature description in the prompt", async () => {
        await runPlan("Add plant watering schedule", "/tmp/test", mockAgents);

        expect(queryCallLog[0].prompt).toContain("Add plant watering schedule");
    });

    it("forwards hooks to the coordinator", async () => {
        // eslint-disable-next-line vitest/require-mock-type-parameters -- complex SDK hook signature
        const fakeHooks = { SubagentStop: [{ hooks: [vi.fn()] }] };

        await runPlan("Add watering", "/tmp/test", mockAgents, undefined, fakeHooks);

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options.hooks).toBe(fakeHooks);
    });
});
