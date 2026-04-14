import { describe, expect, it } from "vitest";

import type { SupervisorEvent, SupervisorState } from "../../../src/hooks/supervisor/state.js";
import { applyEventToState, createDefaultState } from "../../../src/hooks/supervisor/state.js";
import checkFileThrash, { FILE_TOTAL_BUDGET, SAME_FILE_THRESHOLD } from "../../../src/hooks/supervisor/file-thrash.js";

const HOT_FILE = "C:/project/knip.json";
const OTHER_FILE = "C:/project/src/fix.tsx";
const ANOTHER_FILE = "C:/project/src/other.tsx";

let eventIndex = 0;

function resetIndex(): void {
    eventIndex = 0;
}

function makeEditEvent(path = HOT_FILE): SupervisorEvent {
    eventIndex += 1;

    return {
        index: eventIndex,
        timestamp: Date.now(),
        toolName: "Edit",
        targetPath: path,
        isBrowserCommand: false,
        isScreenshotCommand: false,
        isTestCommand: false
    };
}

function makeWriteEvent(path = HOT_FILE): SupervisorEvent {
    eventIndex += 1;

    return {
        index: eventIndex,
        timestamp: Date.now(),
        toolName: "Write",
        targetPath: path,
        isBrowserCommand: false,
        isScreenshotCommand: false,
        isTestCommand: false
    };
}

function makeReadEvent(path = HOT_FILE): SupervisorEvent {
    eventIndex += 1;

    return {
        index: eventIndex,
        timestamp: Date.now(),
        toolName: "Read",
        targetPath: path,
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

    return checkFileThrash(event, state);
}

describe("file-thrash policy", () => {
    // --- Same-file detection ---

    it("allows Edit/Write below the same-file threshold", () => {
        resetIndex();
        const state = createDefaultState();

        for (let i = 0; i < SAME_FILE_THRESHOLD - 1; i++) {
            const result = applyAndCheck(state, makeEditEvent());
            expect(result).toBeNull();
        }

        expect(state.file.recoveryTier).toBe(0);
    });

    it("triggers tier 1 when same-file threshold is reached", () => {
        resetIndex();
        const state = createDefaultState();

        // Run SAME_FILE_THRESHOLD Edit calls to the same file.
        for (let i = 0; i < SAME_FILE_THRESHOLD - 1; i++) {
            applyAndCheck(state, makeEditEvent());
        }

        // The threshold-th call triggers recovery.
        const result = applyAndCheck(state, makeEditEvent());
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.severity).toBe("recovery");
        expect(result!.tier).toBe(1);
        expect(result!.reason).toContain("File loop detected");
        expect(result!.reason).toContain("Stop editing this file repeatedly");
    });

    it("resets counter when editing a different file", () => {
        resetIndex();
        const state = createDefaultState();

        // Edit the hot file 3 times, then a different file.
        applyAndCheck(state, makeEditEvent());
        applyAndCheck(state, makeEditEvent());
        applyAndCheck(state, makeEditEvent());
        applyAndCheck(state, makeEditEvent(OTHER_FILE));

        // Counter was reset — the different file is now the hot file with 1 hit.
        expect(state.file.sameFileHits).toBe(1);
        expect(state.file.currentHotFile).toBe(OTHER_FILE);

        // Can edit the new hot file up to threshold - 1 without triggering.
        for (let i = 0; i < SAME_FILE_THRESHOLD - 2; i++) {
            const result = applyAndCheck(state, makeEditEvent(OTHER_FILE));
            expect(result).toBeNull();
        }
    });

    it("does NOT reset counter on Read/Bash", () => {
        resetIndex();
        const state = createDefaultState();

        // Interleave Edit with Read/Bash — Read/Bash should not reset.
        for (let i = 0; i < SAME_FILE_THRESHOLD - 1; i++) {
            applyAndCheck(state, makeEditEvent());
            applyAndCheck(state, makeReadEvent());
            applyAndCheck(state, makeBashEvent("cat knip.json"));
        }

        // Next edit should trigger — Read/Bash did not reset the counter.
        const result = applyAndCheck(state, makeEditEvent());
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.reason).toContain("File loop detected");
    });

    // --- Gate enforcement ---

    it("enforces edit gate after tier 1 (requires edit to different file)", () => {
        resetIndex();
        const state = createDefaultState();

        // Trigger tier 1.
        for (let i = 0; i < SAME_FILE_THRESHOLD; i++) {
            applyAndCheck(state, makeEditEvent());
        }

        // Manually set recovery tier as the hook handler would.
        state.file.recoveryTier = 1;
        state.file.differentFilesSinceRecovery = 0;
        state.file.gatedFile = HOT_FILE;

        // Next edit to hot file should be gated.
        const editEvent = makeEditEvent();
        applyEventToState(state, editEvent);
        const blocked = checkFileThrash(editEvent, state);
        expect(blocked).not.toBeNull();
        expect(blocked!.action).toBe("block");
        expect(blocked!.severity).toBe("gate");
        expect(blocked!.reason).toContain("DIFFERENT file");

        // Edit a different file.
        applyAndCheck(state, makeEditEvent(OTHER_FILE));

        // Gate cleared — edit to hot file allowed.
        const allowed = applyAndCheck(state, makeEditEvent());
        expect(allowed).toBeNull();
    });

    it("escalates to tier 2 on second trigger", () => {
        resetIndex();
        const state = createDefaultState();

        // Trigger tier 1.
        for (let i = 0; i < SAME_FILE_THRESHOLD; i++) {
            applyAndCheck(state, makeEditEvent());
        }
        state.file.recoveryTier = 1;
        state.file.differentFilesSinceRecovery = 0;
        state.file.gatedFile = HOT_FILE;

        // Satisfy gate with 1 edit to a different file.
        applyAndCheck(state, makeEditEvent(OTHER_FILE));

        // sameFileHits was reset to 1 when we edited OTHER_FILE.
        // Now edit HOT_FILE enough times to trigger again.
        for (let i = 0; i < SAME_FILE_THRESHOLD - 1; i++) {
            applyAndCheck(state, makeEditEvent());
        }

        const result = applyAndCheck(state, makeEditEvent());
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.severity).toBe("recovery");
        expect(result!.tier).toBe(2);
        expect(result!.reason).toContain("continues after previous warning");
    });

    it("requires 2 different-file edits to clear tier 2 gate", () => {
        resetIndex();
        const state = createDefaultState();
        state.file.recoveryTier = 2;
        state.file.differentFilesSinceRecovery = 0;
        state.file.currentHotFile = HOT_FILE;
        state.file.gatedFile = HOT_FILE;
        state.file.sameFileHits = 3;
        state.file.totalHotFileHits = 8;

        // Edit to hot file should be gated.
        const editEvent1 = makeEditEvent();
        applyEventToState(state, editEvent1);
        const blocked = checkFileThrash(editEvent1, state);
        expect(blocked).not.toBeNull();
        expect(blocked!.action).toBe("block");
        expect(blocked!.reason).toContain("2 more Edit/Write");

        // 1 different file edit is not enough.
        applyAndCheck(state, makeEditEvent(OTHER_FILE));
        const editEvent2 = makeEditEvent();
        applyEventToState(state, editEvent2);
        const stillBlocked = checkFileThrash(editEvent2, state);
        expect(stillBlocked).not.toBeNull();
        expect(stillBlocked!.action).toBe("block");
        expect(stillBlocked!.reason).toContain("1 more Edit/Write");

        // 2nd different file edit clears the gate.
        applyAndCheck(state, makeEditEvent(ANOTHER_FILE));
        const allowed = applyAndCheck(state, makeEditEvent());
        expect(allowed).toBeNull();
    });

    // --- Budget cap ---

    it("blocks when gated file lifetime budget is exhausted", () => {
        resetIndex();
        const state = createDefaultState();
        state.file.currentHotFile = HOT_FILE;
        state.file.gatedFile = HOT_FILE;
        state.file.gatedFileLifetimeHits = FILE_TOTAL_BUDGET + 1;
        state.file.sameFileHits = 2; // Below same-file threshold.

        const editEvent = makeEditEvent();
        applyEventToState(state, editEvent);
        const result = checkFileThrash(editEvent, state);
        expect(result).not.toBeNull();
        expect(result!.action).toBe("block");
        expect(result!.reason).toContain("budget exhausted");
    });

    it("lifetime budget accumulates across recovery cycles (gate satisfy does not reset it)", () => {
        resetIndex();
        const state = createDefaultState();

        // Trigger tier 1.
        for (let i = 0; i < SAME_FILE_THRESHOLD; i++) {
            applyAndCheck(state, makeEditEvent());
        }

        // Simulate recovery handler setting gatedFile and tier.
        state.file.recoveryTier = 1;
        state.file.differentFilesSinceRecovery = 0;
        state.file.gatedFile = HOT_FILE;
        // The first recovery cycle already generated SAME_FILE_THRESHOLD edits.
        // gatedFileLifetimeHits should have been tracking since gatedFile was set,
        // but it starts counting from the NEXT edit to the gated file.
        // Pre-set it to simulate accumulated hits from prior cycles.
        state.file.gatedFileLifetimeHits = SAME_FILE_THRESHOLD;

        // Satisfy gate — edit a different file.
        applyAndCheck(state, makeEditEvent(OTHER_FILE));

        // Return to the hot file — lifetime counter should NOT have reset.
        applyAndCheck(state, makeEditEvent());
        expect(state.file.gatedFileLifetimeHits).toBe(SAME_FILE_THRESHOLD + 1);

        // Edit different file again and return — still accumulating.
        applyAndCheck(state, makeEditEvent(OTHER_FILE));
        applyAndCheck(state, makeEditEvent());
        expect(state.file.gatedFileLifetimeHits).toBe(SAME_FILE_THRESHOLD + 2);
    });

    // --- Non-interference ---

    it("does not interfere with Read/Bash tools", () => {
        resetIndex();
        const state = createDefaultState();

        for (let i = 0; i < 20; i++) {
            const readEvent = makeReadEvent();
            applyEventToState(state, readEvent);
            const readResult = checkFileThrash(readEvent, state);
            expect(readResult).toBeNull();

            const bashEvent = makeBashEvent("pnpm lint");
            applyEventToState(state, bashEvent);
            const bashResult = checkFileThrash(bashEvent, state);
            expect(bashResult).toBeNull();
        }

        expect(state.file.sameFileHits).toBe(0);
    });

    it("alternating between two files never triggers", () => {
        resetIndex();
        const state = createDefaultState();

        // A, B, A, B, A, B... — consecutive same-file count never exceeds 1.
        for (let i = 0; i < 20; i++) {
            const resultA = applyAndCheck(state, makeEditEvent());
            expect(resultA).toBeNull();
            const resultB = applyAndCheck(state, makeEditEvent(OTHER_FILE));
            expect(resultB).toBeNull();
        }

        expect(state.file.sameFileHits).toBe(1);
    });

    // --- Message content ---

    it("includes filename in block message", () => {
        resetIndex();
        const state = createDefaultState();

        for (let i = 0; i < SAME_FILE_THRESHOLD - 1; i++) {
            applyAndCheck(state, makeEditEvent());
        }

        const result = applyAndCheck(state, makeEditEvent());
        expect(result).not.toBeNull();
        expect(result!.reason).toContain("knip.json");
    });
});
