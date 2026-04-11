/**
 * Supervisor PostToolUse hook — scans Bash output for install-bypass
 * evidence and records it in state so a subsequent `pnpm install` can
 * be auto-approved.
 */

import type { HookJSONOutput, PostToolUseHookInput } from "../types.js";
import { findInstallBypassData } from "./install-gate.js";
import type { SupervisorState } from "./state.js";

const PASS: HookJSONOutput = { continue: true };

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

        return PASS;
    };
}
