import { describe, expect, it } from "vitest";

import type { SupervisorState } from "../../../src/hooks/supervisor/state.js";
import { createDefaultState } from "../../../src/hooks/supervisor/state.js";
import checkWallClock, { DEFAULT_THRESHOLD, EXEMPT_AGENTS, THRESHOLDS, getThresholds } from "../../../src/hooks/supervisor/wall-clock.js";
import type { WallClockEvent } from "../../../src/hooks/supervisor/wall-clock.js";

function makeEvent(agentName: string | null, timestampIso: string): WallClockEvent {
    return {
        agentName,
        timestamp: new Date(timestampIso).getTime()
    };
}

function makeState(startedAt: string | null, nudgeFired = false): SupervisorState {
    const state = createDefaultState();
    state.startedAt = startedAt ? new Date(startedAt).getTime() : null;
    state.wallClock.nudgeFired = nudgeFired;

    return state;
}

/** Set per-agent startedAt so wall-clock resolves correctly. */
function setAgentStart(state: SupervisorState, agentName: string, startedAt: string): void {
    state.agentStartedAt[agentName] = new Date(startedAt).getTime();
}

describe("wall-clock policy", () => {
    describe("getThresholds", () => {
        it("returns per-agent thresholds for known agents", () => {
            expect(getThresholds("feature-coder")).toEqual(THRESHOLDS["feature-coder"]);
            expect(getThresholds("feature-reviewer")).toEqual(THRESHOLDS["feature-reviewer"]);
            expect(getThresholds("explorer")).toEqual(THRESHOLDS["explorer"]);
        });

        it("returns default thresholds for unknown agents", () => {
            expect(getThresholds("unknown")).toEqual(DEFAULT_THRESHOLD);
        });

        it("returns null for exempt agents", () => {
            for (const agent of EXEMPT_AGENTS) {
                expect(getThresholds(agent)).toBeNull();
            }
        });

        it("returns null when agentName is null", () => {
            expect(getThresholds(null)).toBeNull();
        });
    });

    describe("checkWallClock", () => {
        const START = "2026-03-27T18:00:00.000Z";

        it("returns null when startedAt is not set", () => {
            const event = makeEvent("feature-coder", START);
            const state = makeState(null);
            expect(checkWallClock(event, state)).toBeNull();
        });

        it("returns null for exempt agents", () => {
            const event = makeEvent("monitor", new Date(new Date(START).getTime() + 60 * 60_000).toISOString());
            const state = makeState(START);
            expect(checkWallClock(event, state)).toBeNull();
        });

        it("returns null when under hard stop threshold for nudge-disabled agent", () => {
            const elapsed = THRESHOLDS["feature-coder"].hardStop - 60_000;
            const event = makeEvent("feature-coder", new Date(new Date(START).getTime() + elapsed).toISOString());
            const state = makeState(START);
            setAgentStart(state, "feature-coder", START);
            expect(checkWallClock(event, state)).toBeNull();
        });

        it("skips nudge when nudge threshold is null", () => {
            // Coder has nudge: null — should never fire a nudge regardless of elapsed time
            const elapsed = 15 * 60_000; // 15 minutes, well past where a nudge would fire
            const event = makeEvent("feature-coder", new Date(new Date(START).getTime() + elapsed).toISOString());
            const state = makeState(START);
            setAgentStart(state, "feature-coder", START);
            expect(checkWallClock(event, state)).toBeNull();
        });

        it("fires nudge at T1 threshold for nudge-enabled agent", () => {
            const elapsed = THRESHOLDS["feature-reviewer"].nudge!;
            const event = makeEvent("feature-reviewer", new Date(new Date(START).getTime() + elapsed).toISOString());
            const state = makeState(START);
            setAgentStart(state, "feature-reviewer", START);

            const result = checkWallClock(event, state);
            expect(result!.action).toBe("block");
            expect(result!.severity).toBe("nudge");
            expect(result!.reason).toContain("Pause and reflect");
            expect(result!.reason).toContain("10 minutes");
        });

        it("does not fire nudge a second time after nudgeFired is set", () => {
            const elapsed = THRESHOLDS["feature-reviewer"].nudge! + 60_000;
            const event = makeEvent("feature-reviewer", new Date(new Date(START).getTime() + elapsed).toISOString());
            const state = makeState(START, true);
            setAgentStart(state, "feature-reviewer", START);
            state.wallClock.nudgeFiredPerAgent["feature-reviewer"] = true;
            expect(checkWallClock(event, state)).toBeNull();
        });

        it("fires hard stop at T2 threshold", () => {
            const elapsed = THRESHOLDS["feature-coder"].hardStop;
            const event = makeEvent("feature-coder", new Date(new Date(START).getTime() + elapsed).toISOString());
            const state = makeState(START, false);
            setAgentStart(state, "feature-coder", START);

            const result = checkWallClock(event, state);
            expect(result!.action).toBe("block");
            expect(result!.severity).toBe("hard-stop");
            expect(result!.reason).toContain("STOP");
            expect(result!.reason).toContain("30 minutes");
        });

        it("uses different thresholds for reviewer vs coder", () => {
            const reviewerNudge = THRESHOLDS["feature-reviewer"].nudge!;
            const event = makeEvent("feature-reviewer", new Date(new Date(START).getTime() + reviewerNudge).toISOString());
            const state = makeState(START);
            setAgentStart(state, "feature-reviewer", START);

            const result = checkWallClock(event, state);
            expect(result!.action).toBe("block");
            expect(result!.severity).toBe("nudge");
            expect(result!.reason).toContain("10 minutes");
        });

        it("uses default thresholds for unknown agent types", () => {
            const defaultNudge = DEFAULT_THRESHOLD.nudge!;
            const event = makeEvent("custom", new Date(new Date(START).getTime() + defaultNudge).toISOString());
            const state = makeState(START);
            setAgentStart(state, "custom", START);

            const result = checkWallClock(event, state);
            expect(result!.action).toBe("block");
            expect(result!.severity).toBe("nudge");
        });
    });
});
