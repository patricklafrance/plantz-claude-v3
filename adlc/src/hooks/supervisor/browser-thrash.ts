/**
 * Browser thrash policy — dual detection with recovery tiers.
 *
 * Two orthogonal detectors catch different stuck patterns:
 * - Density (rolling window) — cross-page eval spirals where the agent jumps
 *   URLs without editing code. Resets naturally as non-browser events enter
 *   the window. Threshold 0.75 in 12 events.
 * - Repetition (counter) — same-page probing loops where the agent screenshots
 *   or evals the same URL repeatedly without editing code. Resets on Edit/Write
 *   or URL change. Threshold 8 calls.
 *
 * Both are needed because reviewers legitimately make 25-34 browser calls with
 * 0-2 edits across 7-13 distinct URLs (~3.5 calls/URL). A unified "calls since
 * Edit/Write" counter would false-positive on every reviewer run. The URL-change
 * reset on repetition and the rolling window on density prevent this.
 *
 * Five checks in priority order:
 * 1. Gate enforcement — blocks browser calls until non-browser work is done
 * 2. Density detection — catches cross-page spirals, escalates through tiers
 * 3. Repetition detection — catches same-page probing loops
 * 4. Total budget — hard cap on browser calls per run
 * 5. Screenshot nudge — one-time suggestion on first screenshot
 */

import type { SupervisorEvent, SupervisorState } from "./state.ts";

interface BrowserThrashResult {
    action: "block";
    severity: "gate" | "nudge" | "recovery";
    tier?: number;
    reason: string;
}

// Total browser calls allowed per agent run. Raised from 30 to 50 to
// accommodate recovery overhead (the agent may legitimately return to the
// browser after doing non-browser recovery work).
export const BROWSER_TOTAL_BUDGET = 50;

// Same-target repetition: when the agent makes this many browser calls
// targeting the same page without an Edit/Write (i.e., without making
// progress), it is likely stuck probing the same state. This catches
// screenshot-then-Read loops that evade density detection.
export const SAME_TARGET_THRESHOLD = 8;

// Density threshold: when this fraction of recent events are browser commands,
// the agent is likely stuck. 0.75 = 9 out of 12 events.
const BROWSER_DENSITY_THRESHOLD = 0.75;

// Minimum total browser calls before density detection activates. Prevents
// false positives during initial browser setup where several calls in a row
// are normal.
export const BROWSER_DENSITY_MIN_CALLS = 8;

// Non-browser calls required before the next browser call is allowed.
const TIER_GATES: Record<number, number> = {
    1: 3,
    2: 5
};

const SCREENSHOT_MESSAGE = [
    "[runtime-supervisor] For functional checks, prefer DOM queries over screenshots:",
    "",
    "- `pnpm exec agent-browser diff snapshot` - what changed after an action",
    "- `pnpm exec agent-browser eval --stdin <<'EOF'`",
    "  `JSON.stringify({ hasDialog: !!document.querySelector('[role=dialog]') })`",
    "  `EOF`",
    "- `pnpm exec agent-browser is visible <selector>`",
    "",
    "Reserve screenshots for visual layout verification."
].join("\n");

function browserDensity(recentEvents: SupervisorEvent[]): number {
    if (recentEvents.length < 4) {
        return 0;
    }

    const browserCount = recentEvents.filter(e => e.isBrowserCommand).length;

    return browserCount / recentEvents.length;
}

function recentBrowserFingerprints(recentEvents: SupervisorEvent[]): string[] {
    return recentEvents
        .filter(e => e.isBrowserCommand)
        .map(e => e.commandFingerprint ?? "unknown")
        .slice(-5);
}

function gateMessage(remaining: number): string {
    return `[runtime-supervisor] Browser gated: ${remaining} more non-browser tool call${remaining === 1 ? "" : "s"} required before the next browser command.`;
}

function tier1Message(density: number, recentEvents: SupervisorEvent[]): string {
    const pct = Math.round(density * 100);
    const fingerprints = recentBrowserFingerprints(recentEvents);

    return [
        `[runtime-supervisor] Browser stuck detected: ${pct}% of your last ${recentEvents.length} tool calls were browser commands.`,
        "",
        "Recent browser commands:",
        ...fingerprints.map(fp => `- ${fp}`),
        "",
        "Load the browser-recovery skill (node_modules/@patlaf/adlc/skills/browser-recovery/SKILL.md) to diagnose and plan alternative approaches.",
        "",
        `Your next browser command will be allowed after ${TIER_GATES[1]} non-browser tool calls.`
    ].join("\n");
}

function tier2Message(density: number, recentEvents: SupervisorEvent[]): string {
    const pct = Math.round(density * 100);
    const fingerprints = recentBrowserFingerprints(recentEvents);

    return [
        `[runtime-supervisor] Browser stuck detected AGAIN after recovery (${pct}% density).`,
        "",
        "Recent browser commands:",
        ...fingerprints.map(fp => `- ${fp}`),
        "",
        "Stop using the browser for this specific check. Verify via source code",
        "inspection, tests, or accept the limitation and document it in",
        "your implementation-notes file.",
        "",
        `Your next browser command will be allowed after ${TIER_GATES[2]} non-browser tool calls.`
    ].join("\n");
}

function repetitionMessage(sameTargetCalls: number, currentTarget: string | null): string {
    const targetDisplay = currentTarget ? `on ${currentTarget}` : "on the same page";

    return [
        `[runtime-supervisor] Same-page repetition detected: ${sameTargetCalls} browser calls ${targetDisplay} without editing any code.`,
        "",
        "You are likely probing the same state repeatedly. Stop and read the source",
        "code of the component to understand why it renders this way.",
        "",
        "Load the browser-recovery skill (node_modules/@patlaf/adlc/skills/browser-recovery/SKILL.md) to diagnose and plan alternative approaches.",
        "",
        `Your next browser command will be allowed after ${TIER_GATES[1]} non-browser tool calls.`
    ].join("\n");
}

function totalBudgetMessage(totalCalls: number): string {
    return [
        `[runtime-supervisor] Browser call budget exceeded (${totalCalls}/${BROWSER_TOTAL_BUDGET}).`,
        "",
        "Stop using the browser for this specific check. Verify via source code",
        "inspection, tests, or accept the limitation and document it in",
        "your implementation-notes file.",
        "",
        `Your next browser command will be allowed after ${TIER_GATES[2]} non-browser tool calls.`
    ].join("\n");
}

export default function checkBrowserThrash(event: SupervisorEvent, state: SupervisorState): BrowserThrashResult | null {
    if (event.toolName !== "Bash" || !event.isBrowserCommand) {
        return null;
    }

    // 1. Gate enforcement — if in a recovery tier, require non-browser work first.
    //    Uses severity "gate" so the handler does NOT reset recovery state.
    if (state.browser.recoveryTier > 0) {
        const requiredGate = TIER_GATES[state.browser.recoveryTier] ?? TIER_GATES[2];
        if (state.browser.nonBrowserSinceRecovery < requiredGate) {
            const remaining = requiredGate - state.browser.nonBrowserSinceRecovery;

            return {
                action: "block",
                severity: "gate",
                tier: state.browser.recoveryTier,
                reason: gateMessage(remaining)
            };
        }
        // Gate satisfied — fall through to density/budget checks.
    }

    // 2. Density-based detection — catches cross-page eval spirals where the
    //    agent jumps between URLs (resetting the repetition counter each time).
    //    Only after enough calls to be meaningful.
    if (state.browser.totalCalls >= BROWSER_DENSITY_MIN_CALLS) {
        const density = browserDensity(state.recentEvents);

        if (density >= BROWSER_DENSITY_THRESHOLD) {
            const nextTier = Math.min((state.browser.recoveryTier ?? 0) + 1, 2);
            const message = nextTier === 1 ? tier1Message(density, state.recentEvents) : tier2Message(density, state.recentEvents);

            return { action: "block", severity: "recovery", tier: nextTier, reason: message };
        }
    }

    // 3. Same-target repetition — catches probing loops that evade density
    //    (e.g., screenshot → Read → screenshot → Read on the same page).
    if (state.browser.currentTarget != null && state.browser.sameTargetCalls >= SAME_TARGET_THRESHOLD) {
        const nextTier = Math.min((state.browser.recoveryTier ?? 0) + 1, 2);

        return {
            action: "block",
            severity: "recovery",
            tier: nextTier,
            reason: repetitionMessage(state.browser.sameTargetCalls, state.browser.currentTarget)
        };
    }

    // 4. Total budget — hard cap, triggers tier 2 recovery.
    if (state.browser.totalCalls > BROWSER_TOTAL_BUDGET) {
        return { action: "block", severity: "recovery", tier: 2, reason: totalBudgetMessage(state.browser.totalCalls) };
    }

    // 5. Screenshot nudge — one-time suggestion on first screenshot.
    if (event.isScreenshotCommand && !state.browser.screenshotNudgeFired) {
        return { action: "block", severity: "nudge", reason: SCREENSHOT_MESSAGE };
    }

    return null;
}
