/**
 * Guards hook — stateless tool guardrails run before every tool call.
 *
 * Blocks bad patterns: wrong package manager, cmd.exe, reading node_modules source.
 */

import type { HookJSONOutput, PreToolUseHookInput } from "../types.ts";
import checkBlockEnvWrite from "./block-env-write.ts";
import checkBlockNodeModulesRead from "./block-node-modules-read.ts";
import checkBlockNpm from "./block-npm.ts";
import checkBlockWindowsCmd from "./block-windows-cmd.ts";
import checkBlockWorkflowWrite from "./block-workflow-write.ts";

const guards = [checkBlockNpm, checkBlockWindowsCmd, checkBlockNodeModulesRead, checkBlockEnvWrite, checkBlockWorkflowWrite];

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
