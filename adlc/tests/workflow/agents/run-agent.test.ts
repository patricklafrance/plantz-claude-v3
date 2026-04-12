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

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
    query: vi.fn<any>((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
        queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
        return createMockConversation("ok");
    })
}));

// ── Import under test ───────────────────────────────────────────────────────

import { runAgent, type AgentDefinition } from "../../../src/workflow/agents.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockAgents: Record<string, AgentDefinition> = {
    coder: { description: "mock", prompt: "mock" }
};

const fakeHooks = {
    SubagentStop: [{ hooks: [vi.fn()] }]
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runAgent", () => {
    beforeEach(async () => {
        queryCallLog = [];
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
            return createMockConversation("ok");
        }) as any);
    });

    it("forwards hooks to the SDK query call", async () => {
        await runAgent("coder", "Implement feature", "/tmp/test", mockAgents, undefined, fakeHooks);

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options.hooks).toBe(fakeHooks);
    });

    it("omits hooks from SDK query when not provided", async () => {
        await runAgent("coder", "Implement feature", "/tmp/test", mockAgents);

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options).not.toHaveProperty("hooks");
    });

    it("passes agent name and prompt to the SDK", async () => {
        await runAgent("coder", "Implement the plant list", "/tmp/test", mockAgents);

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options.agent).toBe("coder");
        expect(queryCallLog[0].prompt).toBe("Implement the plant list");
    });

    it("returns the agent result", async () => {
        const { query: mockQuery } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(mockQuery).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
            return createMockConversation("agent output");
        }) as any);

        const result = await runAgent("coder", "Do work", "/tmp/test", mockAgents);

        expect(result).toBe("agent output");
    });
});
