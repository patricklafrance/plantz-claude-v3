import { describe, expect, it } from "vitest";

import checkBrowserThrash, {
    BROWSER_DENSITY_MIN_CALLS,
    BROWSER_TOTAL_BUDGET,
    SAME_TARGET_THRESHOLD
} from "../../../src/hooks/supervisor/browser-thrash.js";
import type { SupervisorEvent, SupervisorState } from "../../../src/hooks/supervisor/state.js";
import { createDefaultState } from "../../../src/hooks/supervisor/state.js";

function makeBrowserEvent(overrides: Partial<SupervisorEvent> = {}): SupervisorEvent {
    return {
        index: 1,
        timestamp: Date.now(),
        toolName: "Bash",
        commandFingerprint: "pnpm exec agent-browser eval 'document.title'",
        isBrowserCommand: true,
        isScreenshotCommand: false,
        isTestCommand: false,
        ...overrides
    };
}

function makeNonBrowserEvent(overrides: Partial<SupervisorEvent> = {}): SupervisorEvent {
    return {
        index: 1,
        timestamp: Date.now(),
        toolName: "Read",
        isBrowserCommand: false,
        isScreenshotCommand: false,
        isTestCommand: false,
        ...overrides
    };
}

function makeScreenshotEvent(overrides: Partial<SupervisorEvent> = {}): SupervisorEvent {
    return {
        index: 1,
        timestamp: Date.now(),
        toolName: "Bash",
        commandFingerprint: "pnpm exec agent-browser screenshot",
        isBrowserCommand: true,
        isScreenshotCommand: true,
        isTestCommand: false,
        ...overrides
    };
}

/** Create a state with high browser density in recentEvents (all browser commands). */
function makeHighDensityState(): SupervisorState {
    const state = createDefaultState();
    state.browser.totalCalls = BROWSER_DENSITY_MIN_CALLS;

    // Fill recentEvents with browser commands to create high density
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

    return state;
}

describe("browser-thrash policy", () => {
    // --- Non-browser events ---

    it("returns null for non-browser events", () => {
        const state = createDefaultState();
        const event = makeNonBrowserEvent();
        expect(checkBrowserThrash(event, state)).toBeNull();
    });

    it("returns null for Bash commands that are not browser commands", () => {
        const state = createDefaultState();
        const event: SupervisorEvent = {
            index: 1,
            timestamp: Date.now(),
            toolName: "Bash",
            commandFingerprint: "git status",
            isBrowserCommand: false,
            isScreenshotCommand: false,
            isTestCommand: false
        };
        expect(checkBrowserThrash(event, state)).toBeNull();
    });

    // --- Screenshot nudge ---

    it("returns nudge on first screenshot when not yet fired", () => {
        const state = createDefaultState();
        state.browser.screenshotNudgeFired = false;
        const event = makeScreenshotEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.severity).toBe("nudge");
        expect(result!.reason).toContain("DOM queries over screenshots");
    });

    it("returns null on screenshot when nudge already fired", () => {
        const state = createDefaultState();
        state.browser.screenshotNudgeFired = true;
        const event = makeScreenshotEvent();

        expect(checkBrowserThrash(event, state)).toBeNull();
    });

    // --- Density detection ---

    it("returns recovery tier 1 when density exceeds threshold", () => {
        const state = makeHighDensityState();
        state.browser.recoveryTier = 0;
        const event = makeBrowserEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.severity).toBe("recovery");
        expect(result!.tier).toBe(1);
        expect(result!.reason).toContain("Browser stuck detected");
        expect(result!.reason).toContain("node_modules/@patlaf/adlc/skills/browser-recovery/SKILL.md");
    });

    it("escalates to tier 2 when already in tier 1 and density still high", () => {
        const state = makeHighDensityState();
        state.browser.recoveryTier = 1;
        // Gate is satisfied — enough non-browser calls
        state.browser.nonBrowserSinceRecovery = 10;
        const event = makeBrowserEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        expect(result!.severity).toBe("recovery");
        expect(result!.tier).toBe(2);
        expect(result!.reason).toContain("AGAIN after recovery");
    });

    it("does not trigger density when totalCalls is below minimum", () => {
        const state = createDefaultState();
        state.browser.totalCalls = BROWSER_DENSITY_MIN_CALLS - 1;
        // Even if recentEvents has high density, under min calls it should not trigger
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
        const event = makeBrowserEvent();

        // Should be null because totalCalls < BROWSER_DENSITY_MIN_CALLS
        // (and no other trigger conditions are met)
        expect(checkBrowserThrash(event, state)).toBeNull();
    });

    // --- Gate enforcement ---

    it("returns gate block when in recovery tier and insufficient non-browser calls", () => {
        const state = createDefaultState();
        state.browser.recoveryTier = 1;
        state.browser.nonBrowserSinceRecovery = 1; // Need 3 for tier 1
        const event = makeBrowserEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.severity).toBe("gate");
        expect(result!.tier).toBe(1);
        expect(result!.reason).toContain("2 more non-browser tool call");
    });

    it("passes gate when enough non-browser calls have been made", () => {
        const state = createDefaultState();
        state.browser.recoveryTier = 1;
        state.browser.nonBrowserSinceRecovery = 3; // Exactly meets tier 1 requirement
        state.browser.totalCalls = 2; // Below density min, no other triggers
        const event = makeBrowserEvent();

        // Gate is satisfied, and no other conditions trigger
        expect(checkBrowserThrash(event, state)).toBeNull();
    });

    it("requires more non-browser calls for tier 2 gate", () => {
        const state = createDefaultState();
        state.browser.recoveryTier = 2;
        state.browser.nonBrowserSinceRecovery = 3; // Need 5 for tier 2
        const event = makeBrowserEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.severity).toBe("gate");
        expect(result!.reason).toContain("2 more non-browser tool call");
    });

    // --- Total budget ---

    it("returns total budget exceeded when totalCalls > BROWSER_TOTAL_BUDGET", () => {
        const state = createDefaultState();
        state.browser.totalCalls = BROWSER_TOTAL_BUDGET + 1;
        const event = makeBrowserEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.severity).toBe("recovery");
        expect(result!.tier).toBe(2);
        expect(result!.reason).toContain("budget exceeded");
        expect(result!.reason).toContain(`${BROWSER_TOTAL_BUDGET + 1}/${BROWSER_TOTAL_BUDGET}`);
    });

    // --- Same-target repetition ---

    it("returns recovery on same-target repetition when sameTargetCalls >= SAME_TARGET_THRESHOLD", () => {
        const state = createDefaultState();
        state.browser.currentTarget = "http://localhost:3000/plants";
        state.browser.sameTargetCalls = SAME_TARGET_THRESHOLD;
        state.browser.totalCalls = 2; // Below density min calls
        const event = makeBrowserEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.severity).toBe("recovery");
        expect(result!.tier).toBe(1);
        expect(result!.reason).toContain("Same-page repetition detected");
        expect(result!.reason).toContain("http://localhost:3000/plants");
    });

    it("does not trigger repetition when currentTarget is null", () => {
        const state = createDefaultState();
        state.browser.currentTarget = null;
        state.browser.sameTargetCalls = SAME_TARGET_THRESHOLD + 5;
        state.browser.totalCalls = 2;
        const event = makeBrowserEvent();

        // currentTarget is null, so repetition check is skipped
        expect(checkBrowserThrash(event, state)).toBeNull();
    });

    // --- Priority ordering ---

    it("gate takes priority over density", () => {
        const state = makeHighDensityState();
        state.browser.recoveryTier = 1;
        state.browser.nonBrowserSinceRecovery = 0;
        const event = makeBrowserEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        // Should be gate, not recovery/density
        expect(result!.severity).toBe("gate");
    });

    it("density takes priority over repetition", () => {
        const state = makeHighDensityState();
        state.browser.currentTarget = "http://localhost:3000";
        state.browser.sameTargetCalls = SAME_TARGET_THRESHOLD;
        const event = makeBrowserEvent();

        const result = checkBrowserThrash(event, state);
        expect(result).not.toBeNull();
        // Should be recovery from density, not repetition
        expect(result!.reason).toContain("Browser stuck detected");
    });
});
