export interface BrowserState {
    totalCalls: number;
    screenshotNudgeFired: boolean;
    recoveryTier: number;
    nonBrowserSinceRecovery: number;
    currentTarget: string | null;
    sameTargetCalls: number;
}

export interface TestState {
    consecutiveWithoutEdit: number;
    totalCalls: number;
    recoveryTier: number;
    editsSinceRecovery: number;
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
    startedAt: number | null;
    /** Per-agent start times — wall-clock thresholds are measured from when each agent first acts. */
    agentStartedAt: Record<string, number>;
    wallClock: WallClockState;
    installBypass: InstallBypass | null;
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
            sameTargetCalls: 0
        },
        test: {
            consecutiveWithoutEdit: 0,
            totalCalls: 0,
            recoveryTier: 0,
            editsSinceRecovery: 0
        },
        startedAt: null,
        agentStartedAt: {},
        wallClock: {
            nudgeFired: false,
            nudgeFiredPerAgent: {}
        },
        installBypass: null
    };
}

/**
 * Reset browser and test counters when a new agent starts within the same
 * session. Prevents the coder's browser usage from poisoning the reviewer's
 * budget. Wall-clock and install state are intentionally preserved.
 */
export function resetAgentLocalState(state: SupervisorState): void {
    state.browser = {
        totalCalls: 0,
        screenshotNudgeFired: false,
        recoveryTier: 0,
        nonBrowserSinceRecovery: 0,
        currentTarget: null,
        sameTargetCalls: 0
    };
    state.test = {
        consecutiveWithoutEdit: 0,
        totalCalls: 0,
        recoveryTier: 0,
        editsSinceRecovery: 0
    };
    state.recentEvents = [];
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
    }

    if (event.toolName === "Bash" && event.isTestCommand) {
        state.test.consecutiveWithoutEdit += 1;
        state.test.totalCalls += 1;
    }

    return state;
}
