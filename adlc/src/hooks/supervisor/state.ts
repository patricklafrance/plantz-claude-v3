export interface BrowserState {
    totalCalls: number;
    screenshotNudgeFired: boolean;
    recoveryTier: number;
    nonBrowserSinceRecovery: number;
    currentTarget: string | null;
    sameTargetCalls: number;
    /** Consecutive browser commands that failed (timeout, connection error, etc.). Reset to 0 on success. */
    consecutiveFailures: number;
}

export interface TestState {
    consecutiveWithoutEdit: number;
    totalCalls: number;
    recoveryTier: number;
    editsSinceRecovery: number;
}

export interface FileState {
    currentHotFile: string | null;
    sameFileHits: number;
    /** Cumulative edits to the gated file across recovery cycles. Unlike sameFileHits, this does NOT reset when the agent edits a different file. */
    gatedFileLifetimeHits: number;
    recoveryTier: number;
    differentFilesSinceRecovery: number;
    /** The file that triggered recovery — edits to this file don't count toward the gate. */
    gatedFile: string | null;
}

export interface WallClockState {
    nudgeFired: boolean;
    /** Per-agent nudge tracking so nudges don't leak across agents in the same session. */
    nudgeFiredPerAgent: Record<string, boolean>;
}

export interface SupervisorEvent {
    index: number;
    timestamp: number;
    toolName: string;
    targetPath?: string;
    commandFingerprint?: string;
    isBrowserCommand: boolean;
    isScreenshotCommand: boolean;
    isTestCommand: boolean;
    browserTarget?: string;
}

export interface InstallBypass {
    active: boolean;
    reason: string;
    matchedPattern: string;
    sourceCommand: string;
    createdAt: string;
    remainingUses: number;
    expiresAfterEvent: number;
}

export interface SupervisorState {
    agentName: string | null;
    eventCount: number;
    recentEvents: SupervisorEvent[];
    browser: BrowserState;
    test: TestState;
    file: FileState;
    startedAt: number | null;
    /** Per-agent start times — wall-clock thresholds are measured from when each agent first acts. */
    agentStartedAt: Record<string, number>;
    wallClock: WallClockState;
    installBypass: InstallBypass | null;
    /** Set when a fatal supervisor event occurs (wall-clock hard-stop, budget exhaustion). Signals that the run should abort. */
    fatalReason: string | null;
}

export function createDefaultState(): SupervisorState {
    return {
        agentName: null,
        eventCount: 0,
        recentEvents: [],
        browser: {
            totalCalls: 0,
            screenshotNudgeFired: false,
            recoveryTier: 0,
            nonBrowserSinceRecovery: 0,
            currentTarget: null,
            sameTargetCalls: 0,
            consecutiveFailures: 0
        },
        test: {
            consecutiveWithoutEdit: 0,
            totalCalls: 0,
            recoveryTier: 0,
            editsSinceRecovery: 0
        },
        file: {
            currentHotFile: null,
            sameFileHits: 0,
            gatedFileLifetimeHits: 0,
            recoveryTier: 0,
            differentFilesSinceRecovery: 0,
            gatedFile: null
        },
        startedAt: null,
        agentStartedAt: {},
        wallClock: {
            nudgeFired: false,
            nudgeFiredPerAgent: {}
        },
        installBypass: null,
        fatalReason: null
    };
}

/**
 * Reset per-agent state when a new agent starts within the same session.
 *
 * Resets: browser counters, test counters, recent events, install bypass,
 * and wall-clock tracking for the incoming agent (so retries of the same
 * agent type get a fresh clock and nudge budget).
 *
 * NOTE: `fatalReason` is intentionally NOT reset — once set, it must persist
 * for the lifetime of this hooks instance so the caller can read it after
 * the agent run completes.
 */
export function resetAgentLocalState(state: SupervisorState, incomingAgent?: string): void {
    state.browser = {
        totalCalls: 0,
        screenshotNudgeFired: false,
        recoveryTier: 0,
        nonBrowserSinceRecovery: 0,
        currentTarget: null,
        sameTargetCalls: 0,
        consecutiveFailures: 0
    };
    state.test = {
        consecutiveWithoutEdit: 0,
        totalCalls: 0,
        recoveryTier: 0,
        editsSinceRecovery: 0
    };
    state.file = {
        currentHotFile: null,
        sameFileHits: 0,
        gatedFileLifetimeHits: 0,
        recoveryTier: 0,
        differentFilesSinceRecovery: 0,
        gatedFile: null
    };
    state.recentEvents = [];
    state.installBypass = null;

    // Clear wall-clock for the incoming agent so retries get a fresh clock.
    if (incomingAgent) {
        delete state.agentStartedAt[incomingAgent];
        delete state.wallClock.nudgeFiredPerAgent[incomingAgent];
    }
}

const RECENT_EVENT_WINDOW = 12;

export function applyEventToState(state: SupervisorState, event: SupervisorEvent): SupervisorState {
    state.eventCount = event.index;

    if (state.startedAt == null) {
        state.startedAt = event.timestamp;
    }

    state.recentEvents.push({
        index: event.index,
        timestamp: event.timestamp,
        toolName: event.toolName,
        targetPath: event.targetPath,
        commandFingerprint: event.commandFingerprint,
        isBrowserCommand: event.isBrowserCommand,
        isScreenshotCommand: event.isScreenshotCommand,
        isTestCommand: event.isTestCommand
    });

    // Keep only the most recent events for rolling-window policies.
    state.recentEvents = state.recentEvents.filter(item => item.index > event.index - RECENT_EVENT_WINDOW);

    if (event.toolName !== "Bash" || !event.isBrowserCommand) {
        state.browser.nonBrowserSinceRecovery += 1;
    }

    if (event.toolName === "Bash" && event.isBrowserCommand) {
        state.browser.totalCalls += 1;

        // Repetition tracking: count browser commands on the same page.
        if (event.browserTarget != null) {
            // "open" command — new page or same page revisited.
            if (event.browserTarget !== state.browser.currentTarget) {
                state.browser.currentTarget = event.browserTarget;
                state.browser.sameTargetCalls = 1;
            } else {
                state.browser.sameTargetCalls += 1;
            }
        } else {
            // Non-open browser command (eval, screenshot, etc.) — stays on current page.
            state.browser.sameTargetCalls += 1;
        }
    }

    // Edit/Write means the agent is making progress — reset repetition counter.
    if (event.toolName === "Edit" || event.toolName === "Write") {
        state.browser.sameTargetCalls = 0;
        state.test.consecutiveWithoutEdit = 0;
        state.test.editsSinceRecovery += 1;

        // File-thrash tracking: count consecutive Edit/Write to the same file.
        const filePath = event.targetPath ?? "";
        if (filePath && filePath === state.file.currentHotFile) {
            state.file.sameFileHits += 1;
        } else if (filePath) {
            // Different file — reset consecutive counter, track as progress.
            // Only count toward the gate if this file is NOT the gated file
            // (editing the gated file again is not "progress").
            if (state.file.currentHotFile != null && filePath !== state.file.gatedFile) {
                state.file.differentFilesSinceRecovery += 1;
            }
            state.file.currentHotFile = filePath;
            state.file.sameFileHits = 1;
        }

        // Track lifetime hits for the gated file across recovery cycles.
        // This counter persists across file switches so the budget cap works.
        if (filePath && state.file.gatedFile && filePath === state.file.gatedFile) {
            state.file.gatedFileLifetimeHits += 1;
        }
    }

    if (event.toolName === "Bash" && event.isTestCommand) {
        state.test.consecutiveWithoutEdit += 1;
        state.test.totalCalls += 1;
    }

    return state;
}
