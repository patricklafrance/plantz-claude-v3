/** Hook assembly — creates the SDK hooks configuration object. */

import { createGuardsHook } from "./guards/create-guards-hook.ts";
import { createPostAgentValidationHook } from "./post-agent-validation/create-post-agent-validation-hook.ts";
import { createPreCommitHook } from "./pre-commit/create-pre-commit-hook.ts";
import { createRewritesHook } from "./rewrites/create-rewrites-hook.ts";
import { createSupervisorHooks } from "./supervisor/create-supervisor-hooks.ts";
import type { HookJSONOutput, PostToolUseHookInput, PreToolUseHookInput, SubagentStopHookInput } from "./types.ts";

// ── SDK callback types (kept local to avoid SDK dependency at type level) ──

type HookInput = PreToolUseHookInput | PostToolUseHookInput | SubagentStopHookInput;
type HookCallback = (input: HookInput, toolUseID: string | undefined, options: { signal: AbortSignal }) => Promise<HookJSONOutput>;

interface HookCallbackMatcher {
    matcher?: string;
    hooks: HookCallback[];
    timeout?: number;
}

type SDKHooks = Partial<Record<string, HookCallbackMatcher[]>>;

// ── Adapter: wrap our typed callbacks into the generic SDK callback shape ──

function wrapPreToolHook(fn: (input: PreToolUseHookInput) => Promise<HookJSONOutput>): HookCallback {
    return (input, _toolUseID, _options) => fn(input as PreToolUseHookInput);
}

function wrapPostToolHook(fn: (input: PostToolUseHookInput) => Promise<HookJSONOutput>): HookCallback {
    return (input, _toolUseID, _options) => fn(input as PostToolUseHookInput);
}

function wrapSubagentStopHook(fn: (input: SubagentStopHookInput) => Promise<HookJSONOutput>): HookCallback {
    return (input, _toolUseID, _options) => fn(input as SubagentStopHookInput);
}

// ── Public API ───────────────────────────────────────────────────────

export function createHooks(_options?: { cwd?: string }): { hooks: SDKHooks } {
    const preCommitHook = wrapPreToolHook(createPreCommitHook());
    const rewritesHook = wrapPreToolHook(createRewritesHook());
    const guardsHook = wrapPreToolHook(createGuardsHook());
    const { preToolHook, postToolHook } = createSupervisorHooks();
    const supervisorPreHook = wrapPreToolHook(preToolHook);
    const supervisorPostHook = wrapPostToolHook(postToolHook);
    const postAgentValidationHook = wrapSubagentStopHook(createPostAgentValidationHook());

    return {
        hooks: {
            PreToolUse: [{ matcher: "Bash", hooks: [preCommitHook, rewritesHook] }, { hooks: [guardsHook, supervisorPreHook] }],
            PostToolUse: [{ matcher: "Bash", hooks: [supervisorPostHook] }],
            SubagentStop: [{ hooks: [postAgentValidationHook] }]
        }
    };
}
