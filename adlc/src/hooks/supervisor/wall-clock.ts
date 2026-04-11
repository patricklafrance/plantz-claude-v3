/**
 * Wall-clock circuit breaker policy.
 *
 * Detects agents that run too long without completing. Two tiers:
 * - Nudge (T1): blocks ONE tool call with a reflection prompt, then allows subsequent calls.
 * - Hard stop (T2): blocks ALL tool calls, forcing the agent to return to the coordinator.
 *
 * Thresholds are per-agent-type, calibrated from observed healthy run durations.
 */

import type { SupervisorState } from "./state.ts";

export interface WallClockEvent {
    agentName: string | null;
    timestamp: number;
}

interface WallClockResult {
    action: "block";
    severity: "nudge" | "hard-stop";
    reason: string;
}

interface Threshold {
    nudge: number | null;
    hardStop: number;
}

const MINUTES = 60_000;

export const THRESHOLDS: Record<string, Threshold> = {
    coder: { nudge: null, hardStop: 30 * MINUTES },
    reviewer: { nudge: 10 * MINUTES, hardStop: 15 * MINUTES },
    explorer: { nudge: 5 * MINUTES, hardStop: 8 * MINUTES },
    planner: { nudge: 5 * MINUTES, hardStop: 8 * MINUTES },
    "plan-gate": { nudge: 5 * MINUTES, hardStop: 8 * MINUTES },
    "domain-mapper": { nudge: 5 * MINUTES, hardStop: 8 * MINUTES },
    pr: { nudge: 5 * MINUTES, hardStop: 8 * MINUTES },
    document: { nudge: 5 * MINUTES, hardStop: 8 * MINUTES },
    "evidence-researcher": { nudge: 3 * MINUTES, hardStop: 5 * MINUTES },
    "placement-gate": { nudge: 3 * MINUTES, hardStop: 5 * MINUTES }
};

export const DEFAULT_THRESHOLD: Threshold = { nudge: 10 * MINUTES, hardStop: 15 * MINUTES };

export const EXEMPT_AGENTS = new Set(["monitor"]);

function formatMinutes(ms: number): string {
    return `${Math.round(ms / MINUTES)}`;
}

function nudgeMessage(elapsedMs: number): string {
    return [
        `[runtime-supervisor] You have been running for ${formatMinutes(elapsedMs)} minutes.`,
        "",
        "Pause and reflect:",
        "- What is still failing?",
        "- Is your current approach converging or are you repeating variations of the same fix?",
        "- If not converging, what fundamentally different strategy could you try?",
        "",
        "Summarize your assessment, then continue."
    ].join("\n");
}

function hardStopMessage(elapsedMs: number): string {
    return [
        `[runtime-supervisor] STOP. You have been running for ${formatMinutes(elapsedMs)} minutes without completing.`,
        "",
        "All further tool calls will be blocked. Return your current status to the coordinator immediately, including:",
        "- What you accomplished",
        "- What is still failing",
        "- What approach you were trying"
    ].join("\n");
}

export function getThresholds(agentName: string | null): Threshold | null {
    if (!agentName || EXEMPT_AGENTS.has(agentName)) {
        return null;
    }

    return THRESHOLDS[agentName] ?? DEFAULT_THRESHOLD;
}

export default function checkWallClock(event: WallClockEvent, state: SupervisorState): WallClockResult | null {
    const thresholds = getThresholds(event.agentName);
    if (!thresholds) {
        return null;
    }

    if (!state.startedAt) {
        return null;
    }

    const elapsed = event.timestamp - state.startedAt;

    if (elapsed >= thresholds.hardStop) {
        return {
            action: "block",
            severity: "hard-stop",
            reason: hardStopMessage(elapsed)
        };
    }

    if (thresholds.nudge != null && elapsed >= thresholds.nudge && !state.wallClock.nudgeFired) {
        return {
            action: "block",
            severity: "nudge",
            reason: nudgeMessage(elapsed)
        };
    }

    return null;
}
