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
    return createMockConversation("Created PR #123");
}

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
    query: vi.fn<any>(defaultQueryMock)
}));

// ── Import under test ───────────────────────────────────────────────────────

import { runPr, runPrUpdate } from "../../../src/workflow/steps/pr.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockAgents = {
    pr: { description: "mock", prompt: "mock" }
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runPr", () => {
    beforeEach(async () => {
        queryCallLog = [];
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    it("delegates to pr agent", async () => {
        await runPr("Add plant watering", "/tmp/test", mockAgents);

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options.agent).toBe("pr");
    });

    it("extracts PR number from agent result", async () => {
        const prNumber = await runPr("Add plants", "/tmp/test", mockAgents);

        expect(prNumber).toBe("123");
    });

    it("passes feature description in prompt", async () => {
        await runPr("Add plant watering schedule", "/tmp/test", mockAgents);

        expect(queryCallLog[0].prompt).toContain("Add plant watering schedule");
    });
});

describe("runPrUpdate", () => {
    beforeEach(async () => {
        queryCallLog = [];
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    it("delegates to pr agent with fix mode prompt", async () => {
        await runPrUpdate(
            { prNumber: 42, branch: "feat/plants", issues: [{ number: 51, title: "Fix color", body: "Blue" }] },
            "/tmp/test",
            mockAgents
        );

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options.agent).toBe("pr");
        expect(queryCallLog[0].prompt).toContain("Mode: fix");
    });

    it("includes PR number and issue refs in prompt", async () => {
        await runPrUpdate(
            {
                prNumber: 42,
                branch: "feat/plants",
                issues: [
                    { number: 51, title: "Fix color", body: "Blue" },
                    { number: 52, title: "Fix sort", body: "Sort" }
                ]
            },
            "/tmp/test",
            mockAgents
        );

        expect(queryCallLog[0].prompt).toContain("PR #42");
        expect(queryCallLog[0].prompt).toContain("#51, #52");
    });

    it("returns the PR number as string", async () => {
        const prNumber = await runPrUpdate(
            { prNumber: 42, branch: "feat/plants", issues: [{ number: 51, title: "Fix", body: "Fix" }] },
            "/tmp/test",
            mockAgents
        );

        expect(prNumber).toBe("42");
    });

    it("forwards hooks to the agent", async () => {
        // eslint-disable-next-line vitest/require-mock-type-parameters -- complex SDK hook signature
        const fakeHooks = { SubagentStop: [{ hooks: [vi.fn()] }] };

        await runPrUpdate(
            { prNumber: 42, branch: "feat/plants", issues: [{ number: 51, title: "Fix", body: "Fix" }] },
            "/tmp/test",
            mockAgents,
            undefined,
            fakeHooks
        );

        expect(queryCallLog[0].options.hooks).toBe(fakeHooks);
    });
});
