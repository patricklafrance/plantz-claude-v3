import { describe, expect, it } from "vitest";

import { BROWSER_DENSITY_MIN_CALLS, BROWSER_TOTAL_BUDGET } from "../../../src/hooks/supervisor/browser-thrash.js";
import { createSupervisorPostToolHook } from "../../../src/hooks/supervisor/create-supervisor-post-tool-hook.js";
import { createSupervisorPreToolHook } from "../../../src/hooks/supervisor/create-supervisor-pre-tool-hook.js";
import { FILE_TOTAL_BUDGET, SAME_FILE_THRESHOLD } from "../../../src/hooks/supervisor/file-thrash.js";
import { createDefaultState, resetAgentLocalState, type SupervisorState } from "../../../src/hooks/supervisor/state.js";
import { EDIT_GAP_THRESHOLD, TEST_TOTAL_BUDGET } from "../../../src/hooks/supervisor/test-thrash.js";
import { THRESHOLDS } from "../../../src/hooks/supervisor/wall-clock.js";
import type { PreToolUseHookInput, PostToolUseHookInput } from "../../../src/hooks/types.js";

function makePreToolInput(overrides: Partial<PreToolUseHookInput> = {}): PreToolUseHookInput {
    return {
        hook_event_name: "PreToolUse",
        session_id: "test-session",
        transcript_path: "/tmp/transcript.json",
        cwd: "/tmp/test-project",
        agent_type: "feature-coder",
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
        agent_type: "feature-coder",
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
        const reviewerNudge = THRESHOLDS["feature-reviewer"].nudge!;

        // Simulate agent having started a while ago
        const agentStart = Date.now() - reviewerNudge - 1000;
        state.startedAt = agentStart;
        state.agentStartedAt["feature-reviewer"] = agentStart;

        const hook = createSupervisorPreToolHook(state);
        const result = await hook(
            makePreToolInput({
                agent_type: "feature-reviewer",
                tool_input: { command: "git diff" }
            })
        );

        expect(result.decision).toBe("block");
        expect(result.reason).toContain("Pause and reflect");
        expect(state.wallClock.nudgeFired).toBe(true);
    });

    it("does not fire wall-clock nudge a second time", async () => {
        const state = createDefaultState();
        const reviewerNudge = THRESHOLDS["feature-reviewer"].nudge!;
        const agentStart = Date.now() - reviewerNudge - 1000;
        state.startedAt = agentStart;
        state.agentStartedAt["feature-reviewer"] = agentStart;
        state.wallClock.nudgeFired = true;
        state.wallClock.nudgeFiredPerAgent["feature-reviewer"] = true;

        const hook = createSupervisorPreToolHook(state);
        const result = await hook(
            makePreToolInput({
                agent_type: "feature-reviewer",
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

    it("resets browser and test state when agent changes", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPreToolHook(state);

        // Simulate coder accumulating browser state
        await hook(makePreToolInput({ agent_type: "feature-coder", tool_input: { command: "git status" } }));
        state.browser.totalCalls = 40;
        state.browser.recoveryTier = 1;
        state.test.totalCalls = 5;

        // Switch to reviewer — state should reset
        await hook(makePreToolInput({ agent_type: "feature-reviewer", tool_input: { command: "git status" } }));

        expect(state.agentName).toBe("feature-reviewer");
        expect(state.browser.totalCalls).toBe(0);
        expect(state.browser.recoveryTier).toBe(0);
        expect(state.test.totalCalls).toBe(0);
    });

    it("clears install bypass when agent changes", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPreToolHook(state);

        await hook(makePreToolInput({ agent_type: "feature-coder", tool_input: { command: "git status" } }));
        state.installBypass = {
            active: true,
            reason: "missing-dependency-evidence",
            matchedPattern: "ERR_PNPM_OUTDATED_LOCKFILE",
            sourceCommand: "pnpm turbo run build",
            createdAt: new Date().toISOString(),
            remainingUses: 1,
            expiresAfterEvent: state.eventCount + 5
        };

        // Switch to reviewer — install bypass should be cleared
        await hook(makePreToolInput({ agent_type: "feature-reviewer", tool_input: { command: "git status" } }));

        expect(state.installBypass).toBeNull();
    });

    it("resets wall-clock for same agent type on retry", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPreToolHook(state);

        // First reviewer run
        await hook(makePreToolInput({ agent_type: "feature-coder", tool_input: { command: "git status" } }));
        await hook(makePreToolInput({ agent_type: "feature-reviewer", tool_input: { command: "git status" } }));
        const firstStart = state.agentStartedAt["feature-reviewer"];
        state.wallClock.nudgeFiredPerAgent["feature-reviewer"] = true;

        // Switch back to coder then to reviewer again (retry)
        await hook(makePreToolInput({ agent_type: "feature-coder", tool_input: { command: "git status" } }));
        await hook(makePreToolInput({ agent_type: "feature-reviewer", tool_input: { command: "git status" } }));

        // Second reviewer should get a fresh start time and fresh nudge budget
        expect(state.agentStartedAt["feature-reviewer"]).toBeGreaterThanOrEqual(firstStart);
        expect(state.wallClock.nudgeFiredPerAgent["feature-reviewer"]).toBeUndefined();
    });

    it("does not reset state when same agent continues", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPreToolHook(state);

        await hook(makePreToolInput({ agent_type: "feature-coder", tool_input: { command: "git status" } }));
        state.browser.totalCalls = 10;

        await hook(makePreToolInput({ agent_type: "feature-coder", tool_input: { command: "ls" } }));

        expect(state.browser.totalCalls).toBe(10);
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

    // --- fatalReason: positive tests (fatal events MUST set it) ---

    it("sets fatalReason on wall-clock hard-stop", async () => {
        const state = createDefaultState();
        const hardStop = THRESHOLDS["feature-coder"].hardStop;
        const agentStart = Date.now() - hardStop - 1000;
        state.startedAt = agentStart;
        state.agentStartedAt["feature-coder"] = agentStart;

        const hook = createSupervisorPreToolHook(state);
        await hook(makePreToolInput({ tool_input: { command: "git status" } }));

        expect(state.fatalReason).not.toBeNull();
        expect(state.fatalReason).toContain("wall-clock hard-stop");
    });

    it("sets fatalReason on browser budget exhaustion", async () => {
        const state = createDefaultState();
        // Set totalCalls to budget so the next browser call pushes it over.
        // Keep density low and sameTargetCalls low so the budget check (#5) is
        // the one that fires, not density (#3) or repetition (#4).
        state.browser.totalCalls = BROWSER_TOTAL_BUDGET;
        state.browser.sameTargetCalls = 0;
        state.browser.currentTarget = null;
        state.eventCount = BROWSER_TOTAL_BUDGET;
        // Low-density window: mostly non-browser events.
        state.recentEvents = [];
        for (let i = 0; i < 10; i++) {
            state.recentEvents.push({
                index: BROWSER_TOTAL_BUDGET - 10 + i,
                timestamp: Date.now(),
                toolName: "Read",
                isBrowserCommand: false,
                isScreenshotCommand: false,
                isTestCommand: false
            });
        }

        const hook = createSupervisorPreToolHook(state);
        await hook(
            makePreToolInput({
                tool_input: { command: "pnpm exec agent-browser eval 'document.title'" }
            })
        );

        expect(state.fatalReason).not.toBeNull();
        expect(state.fatalReason).toContain("browser budget exhausted");
    });

    it("sets fatalReason on test budget exhaustion", async () => {
        const state = createDefaultState();
        state.test.totalCalls = TEST_TOTAL_BUDGET;
        state.test.consecutiveWithoutEdit = EDIT_GAP_THRESHOLD;

        const hook = createSupervisorPreToolHook(state);
        await hook(
            makePreToolInput({
                tool_input: { command: "pnpm --filter @plantz/app test" }
            })
        );

        expect(state.fatalReason).not.toBeNull();
        expect(state.fatalReason).toContain("test budget exhausted");
    });

    it("sets fatalReason on file budget exhaustion", async () => {
        const state = createDefaultState();
        state.file.currentHotFile = "/tmp/knip.json";
        state.file.gatedFile = "/tmp/knip.json";
        state.file.gatedFileLifetimeHits = FILE_TOTAL_BUDGET + 1;
        state.file.sameFileHits = SAME_FILE_THRESHOLD - 1;

        const hook = createSupervisorPreToolHook(state);
        await hook(
            makePreToolInput({
                tool_name: "Edit",
                tool_input: { file_path: "/tmp/knip.json", old_string: "a", new_string: "b" }
            })
        );

        expect(state.fatalReason).not.toBeNull();
        expect(state.fatalReason).toContain("file budget exhausted");
    });

    // --- fatalReason: negative tests (non-fatal events must NOT set it) ---

    it("does not set fatalReason on wall-clock nudge", async () => {
        const state = createDefaultState();
        const reviewerNudge = THRESHOLDS["feature-reviewer"].nudge!;
        const agentStart = Date.now() - reviewerNudge - 1000;
        state.startedAt = agentStart;
        state.agentStartedAt["feature-reviewer"] = agentStart;

        const hook = createSupervisorPreToolHook(state);
        await hook(makePreToolInput({ agent_type: "feature-reviewer", tool_input: { command: "git diff" } }));

        expect(state.fatalReason).toBeNull();
    });

    it("does not set fatalReason on browser recovery (below budget)", async () => {
        const state = createDefaultState();
        fillHighDensityBrowserState(state);
        // totalCalls is at BROWSER_DENSITY_MIN_CALLS (8), well below BROWSER_TOTAL_BUDGET (50)

        const hook = createSupervisorPreToolHook(state);
        await hook(
            makePreToolInput({
                tool_input: { command: "pnpm exec agent-browser eval 'document.title'" }
            })
        );

        expect(state.browser.recoveryTier).toBe(1);
        expect(state.fatalReason).toBeNull();
    });

    it("does not set fatalReason on test recovery (below budget)", async () => {
        const state = createDefaultState();
        state.test.consecutiveWithoutEdit = EDIT_GAP_THRESHOLD;
        state.test.totalCalls = EDIT_GAP_THRESHOLD; // Well below TEST_TOTAL_BUDGET

        const hook = createSupervisorPreToolHook(state);
        await hook(
            makePreToolInput({
                tool_input: { command: "pnpm --filter @plantz/app test" }
            })
        );

        expect(state.test.recoveryTier).toBe(1);
        expect(state.fatalReason).toBeNull();
    });

    it("does not set fatalReason on file recovery (below budget)", async () => {
        const state = createDefaultState();
        // Trigger file thrash but stay below total budget
        state.file.currentHotFile = "/tmp/knip.json";
        state.file.sameFileHits = SAME_FILE_THRESHOLD - 1;

        const hook = createSupervisorPreToolHook(state);
        await hook(
            makePreToolInput({
                tool_name: "Edit",
                tool_input: { file_path: "/tmp/knip.json", old_string: "a", new_string: "b" }
            })
        );

        expect(state.file.recoveryTier).toBe(1);
        expect(state.fatalReason).toBeNull();
    });

    // --- fatalReason: persistence ---

    it("fatalReason persists across agent change (resetAgentLocalState)", async () => {
        const state = createDefaultState();
        state.agentName = "feature-coder";
        state.fatalReason = "wall-clock hard-stop: feature-coder exceeded time limit";

        resetAgentLocalState(state, "feature-reviewer");

        expect(state.fatalReason).toBe("wall-clock hard-stop: feature-coder exceeded time limit");
    });

    it("createDefaultState initializes fatalReason to null", () => {
        const state = createDefaultState();
        expect(state.fatalReason).toBeNull();
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

    it("does not record bypass for install commands with non-lockfile errors", async () => {
        const state = createDefaultState();
        const hook = createSupervisorPostToolHook(state);

        await hook(
            makePostToolInput({
                tool_input: { command: "pnpm install" },
                tool_response: {
                    stderr: "Cannot find package 'some-pkg'"
                }
            })
        );

        expect(state.installBypass).toBeNull();
    });

    it("records bypass for install commands with ERR_PNPM_OUTDATED_LOCKFILE", async () => {
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

        expect(state.installBypass).not.toBeNull();
        expect(state.installBypass!.active).toBe(true);
    });
});
