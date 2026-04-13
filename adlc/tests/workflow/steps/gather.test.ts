import { resolve } from "node:path";
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

let agentResult = "";

function defaultQueryMock(params: { prompt: string | unknown; options?: Record<string, unknown> }) {
    queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
    return createMockConversation(agentResult);
}

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
    query: vi.fn<any>(defaultQueryMock)
}));

// ── Mock fs ─────────────────────────────────────────────────────────────────

let writtenFiles: Record<string, string> = {};
let mockFileContents: Record<string, string> = {};

vi.mock("node:fs", async (importOriginal) => {
    const actual = await importOriginal<typeof import("node:fs")>();
    return {
        ...actual,
        existsSync: vi.fn((path: string) => {
            return path in mockFileContents;
        }),
        writeFileSync: vi.fn((path: string, data: string) => {
            writtenFiles[path] = data;
        }),
        readFileSync: vi.fn((path: string, _encoding?: string) => {
            if (mockFileContents[path]) {
                return mockFileContents[path];
            }
            return actual.readFileSync(path, "utf-8");
        })
    };
});

// ── Import under test ───────────────────────────────────────────────────────

import { runGather } from "../../../src/workflow/steps/gather.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const mockAgents = {
    gather: { description: "mock", prompt: "mock" }
};

const RUN_DIR = "/tmp/test-run";
const INPUT_PATH = resolve(RUN_DIR, "input.md");

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runGather", () => {
    beforeEach(async () => {
        queryCallLog = [];
        agentResult = "";
        writtenFiles = {};
        mockFileContents = {};
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    describe("feat-text mode", () => {
        it("writes description to input.md and returns it", async () => {
            const result = await runGather(
                { type: "feat-text", description: "Add user authentication" },
                RUN_DIR,
                "/tmp/cwd",
                mockAgents
            );

            expect(result.description).toBe("Add user authentication");
            expect(writtenFiles[INPUT_PATH]).toBe("Add user authentication");
            expect(queryCallLog).toHaveLength(0);
        });
    });

    describe("fix-text mode", () => {
        it("writes description to input.md and returns it", async () => {
            const result = await runGather(
                { type: "fix-text", prNumber: 42, description: "Issue #51: Fix color\nColor should be blue" },
                RUN_DIR,
                "/tmp/cwd",
                mockAgents
            );

            expect(result.description).toBe("Issue #51: Fix color\nColor should be blue");
            expect(writtenFiles[INPUT_PATH]).toBe("Issue #51: Fix color\nColor should be blue");
            expect(queryCallLog).toHaveLength(0);
        });
    });

    describe("feat-issue mode", () => {
        it("invokes gather agent with issue number", async () => {
            const fileContent = "Issue #52: Add OAuth\nLink: https://github.com/.../issues/52\n\nAdd OAuth support";
            mockFileContents[INPUT_PATH] = fileContent;
            agentResult = "Done";

            const result = await runGather(
                { type: "feat-issue", issueNumber: 52 },
                RUN_DIR,
                "/tmp/cwd",
                mockAgents
            );

            expect(queryCallLog).toHaveLength(1);
            expect(queryCallLog[0].options.agent).toBe("gather");
            expect(queryCallLog[0].prompt).toContain("#52");
            expect(queryCallLog[0].prompt).toContain("feat-issue");
            expect(result.description).toBe(fileContent);
        });
    });

    describe("fix-pr mode", () => {
        it("invokes gather agent with PR number", async () => {
            const fileContent = "Issue #51: Fix color\nLink: https://github.com/.../issues/51\n\nColor should be blue";
            mockFileContents[INPUT_PATH] = fileContent;
            agentResult = "Done";

            const result = await runGather(
                { type: "fix-pr", prNumber: 42 },
                RUN_DIR,
                "/tmp/cwd",
                mockAgents
            );

            expect(queryCallLog).toHaveLength(1);
            expect(queryCallLog[0].options.agent).toBe("gather");
            expect(queryCallLog[0].prompt).toContain("#42");
            expect(queryCallLog[0].prompt).toContain("fix-pr");
            expect(result.description).toBe(fileContent);
        });

        it("throws when agent returns NO_ISSUES_FOUND", async () => {
            agentResult = "NO_ISSUES_FOUND";

            await expect(
                runGather(
                    { type: "fix-pr", prNumber: 42 },
                    RUN_DIR,
                    "/tmp/cwd",
                    mockAgents
                )
            ).rejects.toThrow("No open adlc-fix issues found linked to PR #42");
        });

        it("throws when agent does not write input.md", async () => {
            agentResult = "Done";
            // mockFileContents not set — existsSync returns false

            await expect(
                runGather(
                    { type: "fix-pr", prNumber: 42 },
                    RUN_DIR,
                    "/tmp/cwd",
                    mockAgents
                )
            ).rejects.toThrow("Gather agent did not write input.md");
        });
    });

    it("forwards hooks to the agent in GitHub mode", async () => {
        mockFileContents[INPUT_PATH] = "Issue content";
        agentResult = "Done";
        // eslint-disable-next-line vitest/require-mock-type-parameters -- complex SDK hook signature
        const fakeHooks = { SubagentStop: [{ hooks: [vi.fn()] }] };

        await runGather(
            { type: "feat-issue", issueNumber: 10 },
            RUN_DIR,
            "/tmp/cwd",
            mockAgents,
            undefined,
            fakeHooks
        );

        expect(queryCallLog[0].options.hooks).toBe(fakeHooks);
    });
});
