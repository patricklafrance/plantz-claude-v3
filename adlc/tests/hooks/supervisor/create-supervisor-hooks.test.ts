import { describe, expect, it } from "vitest";

import { BROWSER_DENSITY_MIN_CALLS } from "../../../src/hooks/supervisor/browser-thrash.js";
import { createSupervisorPostToolHook } from "../../../src/hooks/supervisor/create-supervisor-post-tool-hook.js";
import { createSupervisorPreToolHook } from "../../../src/hooks/supervisor/create-supervisor-pre-tool-hook.js";
import { createDefaultState, type SupervisorState } from "../../../src/hooks/supervisor/state.js";
import { EDIT_GAP_THRESHOLD } from "../../../src/hooks/supervisor/test-thrash.js";
import { THRESHOLDS } from "../../../src/hooks/supervisor/wall-clock.js";
import type { PreToolUseHookInput, PostToolUseHookInput } from "../../../src/hooks/types.js";

function makePreToolInput(overrides: Partial<PreToolUseHookInput> = {}): PreToolUseHookInput {
    return {
        hook_event_name: "PreToolUse",
        session_id: "test-session",
        transcript_path: "/tmp/transcript.json",
        cwd: "/tmp/test-project",
        agent_type: "coder",
        tool_name: "Bash",
        tool_input: { command: "git status" },
        tool_use_id: "tu-1",
        ...overrides
    };
}

function makePostToolInput(overrides: Partial<PostToolUseHookInput> = {}): PostToolUseHookInput {
    return {
        hook_event_name: "PostToolUse",
        session_id: "test-session",
        transcript_path: "/tmp/transcript.json",
        cwd: "/tmp/test-project",
        agent_type: "coder",
        tool_name: "Bash",
        tool_input: { command: "git status" },
        tool_response: {},
        tool_use_id: "tu-1",
        ...overrides
    };
}

/** Pump enough browser events through the hook to build high density. */
function fillHighDensityBrowserState(state: SupervisorState): void {
    state.browser.totalCalls = BROWSER_DENSITY_MIN_CALLS;
    for (let i = 0; i < 12; i++) {
        state.recentEvents.push({
            index: i + 1,
            timestamp: Date.now(),
            toolName: "Bash",
            commandFingerprint: `pnpm exec agent-browser eval 'check ${i}'`,
            isBrowserCommand: true,
            isScreenshotCommand: false,
            isTestCommand: false
        });
    }
    state.eventCount = 12;
}

describe("createSupervisorPreToolHook", () => {
    it("allows a normal Bash command", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPreToolHook(state);

        const result = await hook(makePreToolInput({ tool_input: { command: "git status" } }));
        expect(result).toEqual({ continue: true });
        expect(state.eventCount).toBe(1);
    });

    it("allows a Read tool call", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPreToolHook(state);

        const result = await hook(
            makePreToolInput({
                tool_name: "Read",
                tool_input: { file_path: "/tmp/file.ts" }
            })
        );
        expect(result).toEqual({ continue: true });
    });

    it("blocks browser command when density is high", async () => {
        const state = createDefaultState();
        fillHighDensityBrowserState(state);

        const hook = createSupervisorPreToolHook(state);
        const result = await hook(
            makePreToolInput({
                tool_input: { command: "pnpm exec agent-browser eval 'document.title'" }
            })
        );

        expect(result.decision).toBe("block");
        expect(result.reason).toContain("Browser stuck detected");
        expect(result.hookSpecificOutput).toBeDefined();
        expect(result.hookSpecificOutput!.hookEventName).toBe("PreToolUse");
    });

    it("blocks with wall-clock nudge after configured time", async () => {
        const state = createDefaultState();
        const reviewerNudge = THRESHOLDS["reviewer"].nudge!;

        // Simulate agent having started a while ago
        state.startedAt = Date.now() - reviewerNudge - 1000;

        const hook = createSupervisorPreToolHook(state);
        const result = await hook(
            makePreToolInput({
                agent_type: "reviewer",
                tool_input: { command: "git diff" }
            })
        );

        expect(result.decision).toBe("block");
        expect(result.reason).toContain("Pause and reflect");
        expect(state.wallClock.nudgeFired).toBe(true);
    });

    it("does not fire wall-clock nudge a second time", async () => {
        const state = createDefaultState();
        const reviewerNudge = THRESHOLDS["reviewer"].nudge!;
        state.startedAt = Date.now() - reviewerNudge - 1000;
        state.wallClock.nudgeFired = true;

        const hook = createSupervisorPreToolHook(state);
        const result = await hook(
            makePreToolInput({
                agent_type: "reviewer",
                tool_input: { command: "git diff" }
            })
        );

        // Under hard stop threshold, no nudge fired again
        expect(result).toEqual({ continue: true });
    });

    it("passes non-browser commands through even with high density", async () => {
        const state = createDefaultState();
        fillHighDensityBrowserState(state);

        const hook = createSupervisorPreToolHook(state);
        const result = await hook(
            makePreToolInput({
                tool_input: { command: "git status" }
            })
        );

        expect(result).toEqual({ continue: true });
    });

    it("persists state across multiple calls", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPreToolHook(state);

        // First call
        await hook(makePreToolInput({ tool_input: { command: "git status" } }));
        expect(state.eventCount).toBe(1);
        expect(state.startedAt).not.toBeNull();

        // Second call
        await hook(makePreToolInput({ tool_input: { command: "ls -la" } }));
        expect(state.eventCount).toBe(2);

        // Third call — Edit tool
        await hook(
            makePreToolInput({
                tool_name: "Edit",
                tool_input: { file_path: "/tmp/file.ts", old_string: "a", new_string: "b" }
            })
        );
        expect(state.eventCount).toBe(3);
    });

    it("updates browser recovery tier on browser thrash detection", async () => {
        const state = createDefaultState();
        fillHighDensityBrowserState(state);

        const hook = createSupervisorPreToolHook(state);
        await hook(
            makePreToolInput({
                tool_input: { command: "pnpm exec agent-browser eval 'document.title'" }
            })
        );

        expect(state.browser.recoveryTier).toBe(1);
        expect(state.browser.nonBrowserSinceRecovery).toBe(0);
        expect(state.browser.sameTargetCalls).toBe(0);
    });

    it("blocks test command when edit gap threshold is exceeded", async () => {
        const state = createDefaultState();
        // Simulate consecutive test runs without edits
        state.test.consecutiveWithoutEdit = EDIT_GAP_THRESHOLD;
        state.test.totalCalls = EDIT_GAP_THRESHOLD;

        const hook = createSupervisorPreToolHook(state);
        const result = await hook(
            makePreToolInput({
                tool_input: { command: "pnpm --filter @plantz/app test" }
            })
        );

        expect(result.decision).toBe("block");
        expect(result.reason).toContain("Test loop detected");
    });
});

describe("createSupervisorPostToolHook", () => {
    it("records install bypass evidence from tool output", async () => {
        const state = createDefaultState();
        state.eventCount = 5;
        const hook = createSupervisorPostToolHook(state);

        const result = await hook(
            makePostToolInput({
                tool_input: { command: "pnpm turbo run build" },
                tool_response: {
                    stderr: "ERR_PNPM_OUTDATED_LOCKFILE pnpm-lock.yaml is out of date"
                }
            })
        );

        expect(result).toEqual({ continue: true });
        expect(state.installBypass).not.toBeNull();
        expect(state.installBypass!.active).toBe(true);
        expect(state.installBypass!.reason).toBe("missing-dependency-evidence");
    });

    it("does not record bypass for install commands themselves", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPostToolHook(state);

        await hook(
            makePostToolInput({
                tool_input: { command: "pnpm install" },
                tool_response: {
                    stderr: "ERR_PNPM_OUTDATED_LOCKFILE"
                }
            })
        );

        expect(state.installBypass).toBeNull();
    });
});
