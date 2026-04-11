/**
 * Test thrash policy — edit-gap detection with inline guided recovery.
 *
 * Detects test-command spirals where the agent re-runs test suites without
 * making code changes between runs. The primary signal is "consecutive test
 * commands without an intervening Edit/Write" (edit-gap), not density.
 *
 * Three tiers:
 * 1. Nudge — block ONE call with specific recovery guidance (capture verbose output)
 * 2. Escalation — block with stronger guidance, require 2 edits before next test
 * 3. Budget cap — hard limit on total test commands per agent run
 */

import type { SupervisorEvent, SupervisorState } from "./state.ts";

interface TestThrashResult {
    action: "block";
    severity: "gate" | "recovery";
    tier?: number;
    reason: string;
}

// Consecutive test commands without an Edit/Write before triggering.
export const EDIT_GAP_THRESHOLD = 4;

// Edits required before the next test command is allowed, per tier.
const EDIT_GATES: Record<number, number> = {
    1: 1,
    2: 2
};

// Total test commands allowed per agent run.
export const TEST_TOTAL_BUDGET = 15;

function recentTestFingerprints(recentEvents: SupervisorEvent[]): string[] {
    return recentEvents
        .filter(e => e.isTestCommand)
        .map(e => e.commandFingerprint ?? "unknown")
        .slice(-5);
}

function gateMessage(remaining: number): string {
    return `[runtime-supervisor] Test gated: ${remaining} more Edit/Write call${remaining === 1 ? "" : "s"} required before the next test command. Edit code to fix the failure, then re-run.`;
}

function nudgeMessage(consecutiveCount: number, recentEvents: SupervisorEvent[]): string {
    const fingerprints = recentTestFingerprints(recentEvents);

    return [
        `[runtime-supervisor] Test loop detected: ${consecutiveCount} test runs without code changes.`,
        "",
        "Running the same tests with different grep/tail filters does not fix failures.",
        "Stop and:",
        "1. Run the test ONCE with full output: `pnpm --filter <package> test:<mode> --reporter=verbose 2>&1 | head -200`",
        "2. Read the FULL output — identify the root assertion failure",
        "3. Edit the code to fix it",
        "4. Run the test ONCE more to verify",
        "",
        "Recent test commands:",
        ...fingerprints.map(fp => `- ${fp}`),
        "",
        `Your next test command will be allowed after ${EDIT_GATES[1]} Edit/Write call${EDIT_GATES[1] === 1 ? "" : "s"}.`
    ].join("\n");
}

function escalationMessage(consecutiveCount: number, recentEvents: SupervisorEvent[]): string {
    const fingerprints = recentTestFingerprints(recentEvents);

    return [
        `[runtime-supervisor] Test loop continues after previous warning (${consecutiveCount} runs without edits).`,
        "",
        "STOP running tests. You have enough output to diagnose the failure.",
        "Read the failing test file and the component source code.",
        "Identify the root cause from the code alone, then make your fix.",
        "",
        "Recent test commands:",
        ...fingerprints.map(fp => `- ${fp}`),
        "",
        `Your next test command will be allowed after ${EDIT_GATES[2]} Edit/Write calls.`
    ].join("\n");
}

function budgetMessage(totalCalls: number): string {
    return [
        `[runtime-supervisor] Test run budget exhausted (${totalCalls}/${TEST_TOTAL_BUDGET}).`,
        "",
        "You have used all allocated test runs. Fix the remaining failures based",
        "on the output you already have. If tests still fail, document the status",
        "in your implementation-notes and return to the coordinator."
    ].join("\n");
}

export default function checkTestThrash(event: SupervisorEvent, state: SupervisorState): TestThrashResult | null {
    if (event.toolName !== "Bash" || !event.isTestCommand) {
        return null;
    }

    // 1. Gate enforcement — if in a recovery tier, require edits before next test.
    if (state.test.recoveryTier > 0) {
        const requiredEdits = EDIT_GATES[state.test.recoveryTier] ?? EDIT_GATES[2];
        if (state.test.editsSinceRecovery < requiredEdits) {
            const remaining = requiredEdits - state.test.editsSinceRecovery;

            return {
                action: "block",
                severity: "gate",
                tier: state.test.recoveryTier,
                reason: gateMessage(remaining)
            };
        }
        // Gate satisfied — fall through to edit-gap / budget checks.
    }

    // 2. Edit-gap detection — consecutive test runs without Edit/Write.
    if (state.test.consecutiveWithoutEdit >= EDIT_GAP_THRESHOLD) {
        const nextTier = Math.min((state.test.recoveryTier ?? 0) + 1, 2);
        const message =
            nextTier === 1
                ? nudgeMessage(state.test.consecutiveWithoutEdit, state.recentEvents)
                : escalationMessage(state.test.consecutiveWithoutEdit, state.recentEvents);

        return { action: "block", severity: "recovery", tier: nextTier, reason: message };
    }

    // 3. Total budget — hard cap.
    if (state.test.totalCalls > TEST_TOTAL_BUDGET) {
        return { action: "block", severity: "recovery", tier: 2, reason: budgetMessage(state.test.totalCalls) };
    }

    return null;
}
