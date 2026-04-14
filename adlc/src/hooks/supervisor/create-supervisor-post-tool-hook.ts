/**
 * Supervisor PostToolUse hook — scans Bash output for install-bypass
 * evidence, and tracks browser command failures so the pre-tool hook
 * can trigger recovery after consecutive errors.
 */

import type { HookJSONOutput, PostToolUseHookInput } from "../types.ts";
import { findInstallBypassData } from "./install-gate.ts";
import type { SupervisorState } from "./state.ts";

const PASS: HookJSONOutput = { continue: true };

/** Patterns that indicate a browser command failed at the daemon/connection level. */
const BROWSER_FAILURE_PATTERNS = [
    /os error \d+/i,
    /Failed to (?:read|connect|start)/i,
    /Operation timed out/i,
    /Daemon failed to start/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /connection attempt failed/i
];

function isBrowserCommand(command: string): boolean {
    return /(?:pnpm\s+exec\s+)?agent-browser\b/.test(command);
}

export function isBrowserFailure(output: string): boolean {
    return BROWSER_FAILURE_PATTERNS.some(p => p.test(output));
}

export function createSupervisorPostToolHook(state: SupervisorState) {
    return async (input: PostToolUseHookInput): Promise<HookJSONOutput> => {
        const toolName = input.tool_name;
        const toolInput = (input.tool_input ?? {}) as Record<string, unknown>;

        // Scan Bash output for install-bypass evidence
        const data = findInstallBypassData(state, toolName, toolInput as { command?: string }, {
            toolResponse: input.tool_response as Record<string, unknown>
        });

        if (data) {
            state.installBypass = data.bypass;
        }

        // Track browser command outcomes for consecutive failure detection.
        if (toolName === "Bash") {
            const command = String(toolInput?.command ?? "");

            if (isBrowserCommand(command)) {
                const response = input.tool_response as Record<string, unknown> | undefined;
                const output = String(response?.stdout ?? response?.content ?? response ?? "");

                if (isBrowserFailure(output)) {
                    state.browser.consecutiveFailures += 1;
                } else {
                    state.browser.consecutiveFailures = 0;
                }
            }
        }

        return PASS;
    };
}
