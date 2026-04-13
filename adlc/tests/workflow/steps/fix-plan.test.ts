import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock child_process ─────────────────────────────────────────────────────

vi.mock("node:child_process", () => ({
    execSync: vi.fn<any>()
}));

import { execSync } from "node:child_process";

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

import { collectFixIssues, runFixPlan } from "../../../src/workflow/steps/fix-plan.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockAgents = {
    "fix-planner": { description: "mock", prompt: "mock" }
};

function mockPrView(prNumber: number, branch: string) {
    return JSON.stringify({
        headRefName: branch,
        number: prNumber,
        body: "PR body",
        url: `https://github.com/owner/repo/pull/${prNumber}`
    });
}

function mockIssueList(issues: Array<{ number: number; title: string; body: string }>) {
    return JSON.stringify(issues.map(i => ({
        ...i,
        labels: [{ name: "adlc-fix" }]
    })));
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("collectFixIssues", () => {
    beforeEach(() => {
        vi.mocked(execSync).mockReset();
    });

    it("collects issues linked to the PR by number reference", () => {
        vi.mocked(execSync)
            .mockReturnValueOnce(mockPrView(42, "feat/plants") as any)
            .mockReturnValueOnce(mockIssueList([
                { number: 51, title: "Fix color", body: "PR #42 — color should be blue" },
                { number: 52, title: "Fix sort", body: "PR #42 — sort order wrong" },
                { number: 99, title: "Unrelated", body: "Something about PR #99" }
            ]) as any);

        const result = collectFixIssues(42, "/tmp/test");

        expect(result.prNumber).toBe(42);
        expect(result.branch).toBe("feat/plants");
        expect(result.issues).toHaveLength(2);
        expect(result.issues[0].number).toBe(51);
        expect(result.issues[1].number).toBe(52);
    });

    it("collects issues linked by full PR URL", () => {
        vi.mocked(execSync)
            .mockReturnValueOnce(mockPrView(42, "feat/plants") as any)
            .mockReturnValueOnce(mockIssueList([
                { number: 51, title: "Fix color", body: "https://github.com/owner/repo/pull/42 — color issue" }
            ]) as any);

        const result = collectFixIssues(42, "/tmp/test");

        expect(result.issues).toHaveLength(1);
        expect(result.issues[0].number).toBe(51);
    });

    it("throws when no linked issues found", () => {
        vi.mocked(execSync)
            .mockReturnValueOnce(mockPrView(42, "feat/plants") as any)
            .mockReturnValueOnce(mockIssueList([]) as any);

        expect(() => collectFixIssues(42, "/tmp/test")).toThrow("No open adlc-fix issues found linked to PR #42");
    });

    it("throws when issues exist but none are linked to the PR", () => {
        vi.mocked(execSync)
            .mockReturnValueOnce(mockPrView(42, "feat/plants") as any)
            .mockReturnValueOnce(mockIssueList([
                { number: 99, title: "Other fix", body: "PR #99 — different PR" }
            ]) as any);

        expect(() => collectFixIssues(42, "/tmp/test")).toThrow("No open adlc-fix issues found linked to PR #42");
    });
});

describe("runFixPlan", () => {
    beforeEach(async () => {
        queryCallLog = [];
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    it("delegates to fix-planner agent", async () => {
        await runFixPlan(
            { prNumber: 42, branch: "feat/plants", issues: [{ number: 51, title: "Fix color", body: "Color should be blue" }] },
            "/tmp/test",
            mockAgents
        );

        expect(queryCallLog).toHaveLength(1);
        expect(queryCallLog[0].options.agent).toBe("fix-planner");
    });

    it("includes PR number and issue details in prompt", async () => {
        await runFixPlan(
            {
                prNumber: 42,
                branch: "feat/plants",
                issues: [
                    { number: 51, title: "Fix color", body: "Color should be blue" },
                    { number: 52, title: "Fix sort", body: "Sort order wrong" }
                ]
            },
            "/tmp/test",
            mockAgents
        );

        expect(queryCallLog[0].prompt).toContain("PR #42");
        expect(queryCallLog[0].prompt).toContain("Issue #51");
        expect(queryCallLog[0].prompt).toContain("Fix color");
        expect(queryCallLog[0].prompt).toContain("Issue #52");
        expect(queryCallLog[0].prompt).toContain("Fix sort");
    });

    it("forwards hooks to the agent", async () => {
        // eslint-disable-next-line vitest/require-mock-type-parameters -- complex SDK hook signature
        const fakeHooks = { SubagentStop: [{ hooks: [vi.fn()] }] };

        await runFixPlan(
            { prNumber: 42, branch: "feat/plants", issues: [{ number: 51, title: "Fix", body: "Fix it" }] },
            "/tmp/test",
            mockAgents,
            undefined,
            fakeHooks
        );

        expect(queryCallLog[0].options.hooks).toBe(fakeHooks);
    });
});
