/**
 * Rewrites hook — normalizes command forms before execution.
 *
 * Runs before guards so that both guards and the SDK see the canonical form.
 * Currently handles bare `agent-browser` → `pnpm exec agent-browser`.
 */

import type { HookJSONOutput, PreToolUseHookInput } from "../types.js";
import { rewriteBareAgent } from "./agent-browser-rewrite.js";

export function createRewritesHook() {
    return async (input: PreToolUseHookInput): Promise<HookJSONOutput> => {
        if (input.tool_name !== "Bash") {
            return { continue: true };
        }

        const command = (input.tool_input as Record<string, unknown> | undefined)?.command as string | undefined;
        const rewritten = rewriteBareAgent(command);

        if (rewritten) {
            return {
                continue: true,
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    updatedInput: { command: rewritten }
                }
            };
        }

        return { continue: true };
    };
}
