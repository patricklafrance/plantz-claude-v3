/**
 * Guards hook — stateless tool guardrails run before every tool call.
 *
 * Blocks bad patterns: wrong package manager, cmd.exe, reading node_modules source.
 */

import type { HookJSONOutput, PreToolUseHookInput } from "../types.js";
import checkBlockEnvWrite from "./block-env-write.js";
import checkBlockNodeModulesRead from "./block-node-modules-read.js";
import checkBlockNpm from "./block-npm.js";
import checkBlockWindowsCmd from "./block-windows-cmd.js";

const guards = [checkBlockNpm, checkBlockWindowsCmd, checkBlockNodeModulesRead, checkBlockEnvWrite];

export function createGuardsHook() {
    return async (input: PreToolUseHookInput): Promise<HookJSONOutput> => {
        const toolName = input.tool_name;
        const toolInput = (input.tool_input ?? {}) as Record<string, unknown>;

        for (const guard of guards) {
            const result = guard(toolName, toolInput);
            if (result) {
                return {
                    decision: "block",
                    reason: result.reason,
                    hookSpecificOutput: {
                        hookEventName: "PreToolUse",
                        permissionDecision: "deny",
                        permissionDecisionReason: result.reason
                    }
                };
            }
        }

        return { continue: true };
    };
}
