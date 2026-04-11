import { describe, expect, it } from "vitest";

import type { SupervisorEvent, SupervisorState } from "../../../src/hooks/supervisor/state.js";
import { applyEventToState, createDefaultState } from "../../../src/hooks/supervisor/state.js";
import checkTestThrash, { EDIT_GAP_THRESHOLD, TEST_TOTAL_BUDGET } from "../../../src/hooks/supervisor/test-thrash.js";

const TEST_CMD = "pnpm --filter @apps/today-storybook test:light 2>&1 | tail -30";

let eventIndex = 0;

function resetIndex(): void {
    eventIndex = 0;
}

function makeTestEvent(command = TEST_CMD): SupervisorEvent {
    eventIndex += 1;

    return {
        index: eventIndex,
        timestamp: Date.now(),
        toolName: "Bash",
        commandFingerprint: command,
        isBrowserCommand: false,
        isScreenshotCommand: false,
        isTestCommand: true
    };
}

function makeEditEvent(): SupervisorEvent {
    eventIndex += 1;

    return {
        index: eventIndex,
        timestamp: Date.now(),
        toolName: "Edit",
        targetPath: "src/fix.tsx",
        isBrowserCommand: false,
        isScreenshotCommand: false,
        isTestCommand: false
    };
}

function makeReadEvent(): SupervisorEvent {
    eventIndex += 1;

    return {
        index: eventIndex,
        timestamp: Date.now(),
        toolName: "Read",
        targetPath: "src/test.tsx",
        isBrowserCommand: false,
        isScreenshotCommand: false,
        isTestCommand: false
    };
}

function makeBashEvent(command: string): SupervisorEvent {
    eventIndex += 1;

    return {
        index: eventIndex,
        timestamp: Date.now(),
        toolName: "Bash",
        commandFingerprint: command,
        isBrowserCommand: false,
        isScreenshotCommand: false,
        isTestCommand: false
    };
}

/** Apply an event to state and run the policy check. */
function applyAndCheck(state: SupervisorState, event: SupervisorEvent) {
    applyEventToState(state, event);

    return checkTestThrash(event, state);
}

describe("test-thrash policy", () => {
    // --- Edit-gap detection ---

    it("allows test commands below the edit-gap threshold", () => {
        resetIndex();
        const state = createDefaultState();

        for (let i = 0; i < EDIT_GAP_THRESHOLD - 1; i++) {
            const result = applyAndCheck(state, makeTestEvent());
            expect(result).toBeNull();
        }

        expect(state.test.recoveryTier).toBe(0);
    });

    it("triggers tier 1 recovery when edit-gap threshold is reached", () => {
        resetIndex();
        const state = createDefaultState();

        // Run EDIT_GAP_THRESHOLD test commands without any Edit.
        for (let i = 0; i < EDIT_GAP_THRESHOLD - 1; i++) {
            applyAndCheck(state, makeTestEvent());
        }

        // The threshold-th call triggers recovery.
        const result = applyAndCheck(state, makeTestEvent());
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.reason).toContain("Test loop detected");
        expect(result!.reason).toContain("--reporter=verbose");
    });

    it("resets edit-gap counter on Edit calls", () => {
        resetIndex();
        const state = createDefaultState();

        // Run 2 test commands, then an Edit, then more tests.
        applyAndCheck(state, makeTestEvent());
        applyAndCheck(state, makeTestEvent());
        applyAndCheck(state, makeEditEvent());

        // Counter was reset by the Edit — these should all be allowed.
        for (let i = 0; i < EDIT_GAP_THRESHOLD - 1; i++) {
            const result = applyAndCheck(state, makeTestEvent());
            expect(result).toBeNull();
        }
    });

    it("does NOT reset edit-gap counter on Read or Grep calls", () => {
        resetIndex();
        const state = createDefaultState();

        // Run tests with Read calls interleaved — Read is not progress.
        for (let i = 0; i < EDIT_GAP_THRESHOLD - 1; i++) {
            applyAndCheck(state, makeTestEvent());
            applyAndCheck(state, makeReadEvent());
        }

        // Next test should trigger — Read did not reset the counter.
        const result = applyAndCheck(state, makeTestEvent());
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.reason).toContain("Test loop detected");
    });

    it("does not count non-test bash commands toward edit-gap", () => {
        resetIndex();
        const state = createDefaultState();

        applyAndCheck(state, makeTestEvent());
        applyAndCheck(state, makeBashEvent("pnpm lint"));
        applyAndCheck(state, makeBashEvent("git status"));
        applyAndCheck(state, makeTestEvent());

        expect(state.test.consecutiveWithoutEdit).toBe(2);
    });

    // --- Gate enforcement ---

    it("enforces edit gate after tier 1 recovery", () => {
        resetIndex();
        const state = createDefaultState();

        // Trigger tier 1.
        for (let i = 0; i < EDIT_GAP_THRESHOLD; i++) {
            applyAndCheck(state, makeTestEvent());
        }

        // Manually set recovery tier as the handler would.
        state.test.recoveryTier = 1;
        state.test.editsSinceRecovery = 0;

        // Next test should be gated (1 edit required for tier 1).
        const testEvent = makeTestEvent();
        applyEventToState(state, testEvent);
        const blocked = checkTestThrash(testEvent, state);
        expect(blocked).not.toBeNull();
        expect(blocked!.action).toBe("block");
        expect(blocked!.reason).toContain("Edit/Write call");

        // Do an Edit.
        applyAndCheck(state, makeEditEvent());

        // Gate cleared — test allowed.
        const allowed = applyAndCheck(state, makeTestEvent());
        expect(allowed).toBeNull();
    });

    it("escalates to tier 2 on second recovery trigger", () => {
        resetIndex();
        const state = createDefaultState();

        // Trigger tier 1.
        for (let i = 0; i < EDIT_GAP_THRESHOLD; i++) {
            applyAndCheck(state, makeTestEvent());
        }
        state.test.recoveryTier = 1;
        state.test.editsSinceRecovery = 0;

        // Satisfy gate with 1 Edit.
        applyAndCheck(state, makeEditEvent());

        // Reset consecutiveWithoutEdit so it counts fresh toward EDIT_GAP_THRESHOLD.
        // (The Edit already reset it via applyEventToState.)

        // Run EDIT_GAP_THRESHOLD more tests without editing.
        for (let i = 0; i < EDIT_GAP_THRESHOLD - 1; i++) {
            applyAndCheck(state, makeTestEvent());
        }

        const result = applyAndCheck(state, makeTestEvent());
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.reason).toContain("continues after previous warning");
        expect(result!.severity).toBe("recovery");
        expect(result!.tier).toBe(2);
    });

    it("requires 2 edits to clear tier 2 gate", () => {
        resetIndex();
        const state = createDefaultState();
        state.test.recoveryTier = 2;
        state.test.editsSinceRecovery = 0;
        state.test.totalCalls = 8;

        // Test should be gated.
        const testEvent1 = makeTestEvent();
        applyEventToState(state, testEvent1);
        const blocked = checkTestThrash(testEvent1, state);
        expect(blocked).not.toBeNull();
        expect(blocked!.action).toBe("block");
        expect(blocked!.reason).toContain("2 more Edit/Write call");

        // 1 Edit is not enough.
        applyAndCheck(state, makeEditEvent());
        const testEvent2 = makeTestEvent();
        applyEventToState(state, testEvent2);
        const stillBlocked = checkTestThrash(testEvent2, state);
        expect(stillBlocked).not.toBeNull();
        expect(stillBlocked!.action).toBe("block");
        expect(stillBlocked!.reason).toContain("1 more Edit/Write call");

        // 2nd Edit clears the gate.
        applyAndCheck(state, makeEditEvent());
        const allowed = applyAndCheck(state, makeTestEvent());
        expect(allowed).toBeNull();
    });

    // --- Budget cap ---

    it("blocks when test budget is exceeded", () => {
        resetIndex();
        const state = createDefaultState();
        state.test.totalCalls = TEST_TOTAL_BUDGET + 1;

        const testEvent = makeTestEvent();
        applyEventToState(state, testEvent);
        const result = checkTestThrash(testEvent, state);
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.reason).toContain("budget exhausted");
    });

    // --- Non-interference ---

    it("does not interfere with non-test bash commands", () => {
        resetIndex();
        const state = createDefaultState();

        for (let i = 0; i < 20; i++) {
            const event = makeBashEvent("pnpm lint");
            applyEventToState(state, event);
            const result = checkTestThrash(event, state);
            expect(result).toBeNull();
        }

        expect(state.test.totalCalls).toBe(0);
    });

    // --- Message content ---

    it("includes recent test fingerprints in block message", () => {
        resetIndex();
        const state = createDefaultState();

        for (let i = 0; i < EDIT_GAP_THRESHOLD - 1; i++) {
            applyAndCheck(state, makeTestEvent());
        }

        const result = applyAndCheck(state, makeTestEvent());
        expect(result).not.toBeNull();
        expect(result!.reason).toContain("Recent test commands:");
        expect(result!.reason).toContain("pnpm --filter @apps/today-storybook test:light");
    });
});
