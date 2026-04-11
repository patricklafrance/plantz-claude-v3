import { describe, expect, it, vi } from "vitest";

import type { PreToolUseHookInput } from "../../../src/hooks/types.js";

// ── Mock handler ────────────────────────────────────────────────────────────

let mockProblems: string[] = [];

vi.mock("../../../src/hooks/pre-commit/handler.js", () => ({
    handlePreCommit: vi.fn<any>(async () => mockProblems)
}));

// ── Import under test ───────────────────────────────────────────────────────

import { createPreCommitHook } from "../../../src/hooks/pre-commit/create-pre-commit-hook.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<PreToolUseHookInput> = {}): PreToolUseHookInput {
    return {
        hook_event_name: "PreToolUse",
        session_id: "test",
        transcript_path: "/tmp/transcript.json",
        cwd: "/tmp/test-project",
        tool_name: "Bash",
        tool_input: { command: "git status" },
        tool_use_id: "tu-1",
        ...overrides
    };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("createPreCommitHook", () => {
    it("passes through non-Bash tool calls", async () => {
        const hook = createPreCommitHook();
        const result = await hook(makeInput({ tool_name: "Read", tool_input: { file_path: "/tmp/file.ts" } }));
        expect(result).toEqual({ continue: true });
    });

    it("passes through non-commit Bash commands", async () => {
        const hook = createPreCommitHook();
        const result = await hook(makeInput({ tool_input: { command: "git status" } }));
        expect(result).toEqual({ continue: true });
    });

    it("allows commit when all checks pass", async () => {
        mockProblems = [];
        const hook = createPreCommitHook();
        const result = await hook(makeInput({ tool_input: { command: 'git commit -m "feat: add feature"' } }));
        expect(result).toEqual({ continue: true });
    });

    it("blocks commit when checks fail", async () => {
        mockProblems = ["[build] Build failed:\nError: missing module"];
        const hook = createPreCommitHook();
        const result = await hook(makeInput({ tool_input: { command: 'git commit -m "feat: broken"' } }));

        expect(result.decision).toBe("block");
        expect(result.reason).toContain("Pre-commit checks failed");
        expect(result.reason).toContain("[build] Build failed");
    });

    it("detects git commit in compound commands", async () => {
        mockProblems = ["[test] Tests failed"];
        const hook = createPreCommitHook();
        const result = await hook(makeInput({ tool_input: { command: 'git add . && git commit -m "feat"' } }));

        expect(result.decision).toBe("block");
    });
});
