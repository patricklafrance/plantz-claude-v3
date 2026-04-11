/**
 * Pre-commit hook — intercepts `git commit` Bash commands and runs
 * the validation pipeline before allowing the commit to proceed.
 *
 * Registered on PreToolUse for Bash. Non-commit commands pass through.
 */

import type { HookJSONOutput, PreToolUseHookInput } from "../types.js";
import { handlePreCommit } from "./handler.js";

const GIT_COMMIT_RE = /\bgit\s+commit\b/;

export function createPreCommitHook() {
    return async (input: PreToolUseHookInput): Promise<HookJSONOutput> => {
        if (input.tool_name !== "Bash") {
            return { continue: true };
        }

        const command = String((input.tool_input as Record<string, unknown>)?.command ?? "");
        if (!GIT_COMMIT_RE.test(command)) {
            return { continue: true };
        }

        const problems = await handlePreCommit(input.cwd);

        if (problems.length > 0) {
            return {
                decision: "block",
                reason: `Pre-commit checks failed:\n\n${problems.join("\n\n")}`,
                hookSpecificOutput: {
                    hookEventName: "PreToolUse",
                    permissionDecision: "deny",
                    permissionDecisionReason: "Pre-commit validation failed"
                }
            };
        }

        return { continue: true };
    };
}
