/**
 * Supervisor PreToolUse hook — applies policy functions in priority order:
 * wall-clock, install-gate, browser-thrash, test-thrash.
 * The first policy that returns a block wins.
 */

import type { HookJSONOutput, PreToolUseHookInput } from "../types.ts";
import checkBrowserThrash from "./browser-thrash.ts";
import { buildPreToolEvent } from "./event-builder.ts";
import {
    checkInstallGate,
    clearExpiredInstallBypass,
    consumeInstallBypass,
    hasManifestDiff,
    isInstallCommand,
    readInstallOverride
} from "./install-gate.ts";
import { applyEventToState, resetAgentLocalState, type SupervisorState } from "./state.ts";
import checkTestThrash from "./test-thrash.ts";
import checkWallClock from "./wall-clock.ts";

const PASS: HookJSONOutput = { continue: true };

function blockOutput(reason: string): HookJSONOutput {
    return {
        decision: "block",
        reason,
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason
        }
    };
}

export function createSupervisorPreToolHook(state: SupervisorState) {
    return async (input: PreToolUseHookInput): Promise<HookJSONOutput> => {
        const agentName = input.agent_type ?? null;

        const toolName = input.tool_name;
        const toolInput = (input.tool_input ?? {}) as Record<string, unknown>;

        // 1. Build event and apply to state
        const event = buildPreToolEvent(toolName, toolInput, agentName, state);
        event.timestamp = Date.now();
        applyEventToState(state, event);

        // Track agent name and per-agent start time.
        // When a new agent starts, reset browser/test counters so the
        // coder's browser usage doesn't poison the reviewer's budget.
        if (!state.agentName) {
            state.agentName = agentName;
        } else if (agentName && agentName !== state.agentName) {
            resetAgentLocalState(state);
            state.agentName = agentName;
        }
        if (agentName && !state.agentStartedAt[agentName]) {
            state.agentStartedAt[agentName] = event.timestamp;
        }

        // 2. Wall-clock — highest priority
        const wallClockResult = checkWallClock({ agentName, timestamp: event.timestamp }, state);

        if (wallClockResult) {
            if (wallClockResult.severity === "nudge") {
                state.wallClock.nudgeFired = true;
                if (agentName) {
                    state.wallClock.nudgeFiredPerAgent[agentName] = true;
                }
            }

            return blockOutput(wallClockResult.reason);
        }

        // 3. Install gate — requires I/O, only for install commands
        clearExpiredInstallBypass(state, event.index);

        const isInstall = event.toolName === "Bash" && isInstallCommand(event.commandFingerprint ?? "");
        const manifestDiff = isInstall && hasManifestDiff(input.cwd);
        const overrideReason = isInstall ? readInstallOverride(input.cwd) : null;

        const installResult = checkInstallGate(event, state, { manifestDiff, overrideReason });
        if (installResult?.outcome === "install-bypass-consumed") {
            consumeInstallBypass(state, event.index);
        }
        if (installResult?.action === "block") {
            return blockOutput(installResult.reason!);
        }

        // 4. Browser thrash
        const browserResult = checkBrowserThrash(event, state);
        if (browserResult) {
            if (browserResult.severity === "nudge") {
                state.browser.screenshotNudgeFired = true;
            }
            if (browserResult.severity === "recovery") {
                state.browser.recoveryTier = browserResult.tier!;
                state.browser.nonBrowserSinceRecovery = 0;
                state.browser.sameTargetCalls = 0;
                // Clear the rolling window so stale browser events don't
                // immediately re-trigger density after the gate is cleared.
                state.recentEvents = [];
            }
            if (browserResult.severity === "gate") {
                // Gate-blocked calls never reach the browser — undo the
                // browser counters that applyEventToState already set so
                // blocked retries don't burn the total budget or pollute
                // the density window.
                state.browser.totalCalls -= 1;
                state.browser.sameTargetCalls -= 1;
                state.recentEvents = state.recentEvents.filter(e => e.index !== event.index);
            }

            return blockOutput(browserResult.reason);
        }

        // 5. Test thrash
        const testResult = checkTestThrash(event, state);
        if (testResult) {
            if (testResult.severity === "recovery") {
                state.test.recoveryTier = testResult.tier!;
                state.test.editsSinceRecovery = 0;
            }
            if (testResult.severity === "gate") {
                // Gate-blocked calls never reach the test runner — undo the
                // test counters that applyEventToState already set so
                // blocked retries don't burn the total budget.
                state.test.totalCalls -= 1;
                state.test.consecutiveWithoutEdit -= 1;
                state.recentEvents = state.recentEvents.filter(e => e.index !== event.index);
            }

            return blockOutput(testResult.reason);
        }

        return PASS;
    };
}
