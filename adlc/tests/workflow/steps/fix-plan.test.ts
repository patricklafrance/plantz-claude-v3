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

import { runFixPlan } from "../../../src/workflow/steps/fix-plan.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockAgents = {
    "fix-planner": { description: "mock", prompt: "mock" }
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runFixPlan", () => {
    beforeEach(async () => {
        queryCallLog = [];
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    it("delegates to fix-planner agent", async () => {
        await runFixPlan(
            { prNumber: 42, description: "Issue #51: Fix color\nColor should be blue" },
            "/tmp/test",
            mockAgents
        );

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options.agent).toBe("fix-planner");
    });

    it("includes PR number and description in prompt", async () => {
        await runFixPlan(
            {
                prNumber: 42,
                description: "Issue #51: Fix color\nLink: https://github.com/owner/repo/issues/51\n\nColor should be blue\n\nIssue #52: Fix sort\nLink: https://github.com/owner/repo/issues/52\n\nSort order wrong"
            },
            "/tmp/test",
            mockAgents
        );

        expect(queryCallLog[0].prompt).toContain("PR #42");
        expect(queryCallLog[0].prompt).toContain("Issue #51: Fix color");
        expect(queryCallLog[0].prompt).toContain("Issue #52: Fix sort");
    });

    it("forwards hooks to the agent", async () => {
        // eslint-disable-next-line vitest/require-mock-type-parameters -- complex SDK hook signature
        const fakeHooks = { SubagentStop: [{ hooks: [vi.fn()] }] };

        await runFixPlan(
            { prNumber: 42, description: "Issue #51: Fix it\nFix it" },
            "/tmp/test",
            mockAgents,
            undefined,
            fakeHooks
        );

        expect(queryCallLog[0].options.hooks).toBe(fakeHooks);
    });
});
