/** Hook assembly — creates the SDK hooks configuration object. */

import { createGuardsHook } from "./guards/create-guards-hook.ts";
import { createPostAgentValidationHook } from "./post-agent-validation/create-post-agent-validation-hook.ts";
import { handleStopMetrics } from "./post-agent-validation/metrics.ts";
import { createPreCommitHook } from "./pre-commit/create-pre-commit-hook.ts";
import { createRewritesHook } from "./rewrites/create-rewrites-hook.ts";
import { createSupervisorHooks } from "./supervisor/create-supervisor-hooks.ts";
import type { SupervisorState } from "./supervisor/state.ts";
import type { HookJSONOutput, PostToolUseHookInput, PreToolUseHookInput, StopHookInput, SubagentStopHookInput } from "./types.ts";

// ── SDK callback types (kept local to avoid SDK dependency at type level) ──

type HookInput = PreToolUseHookInput | PostToolUseHookInput | SubagentStopHookInput | StopHookInput;
type HookCallback = (input: HookInput, toolUseID: string | undefined, options: { signal: AbortSignal }) => Promise<HookJSONOutput>;

interface HookCallbackMatcher {
    matcher?: string;
    hooks: HookCallback[];
    timeout?: number;
}

export type SDKHooks = Partial<Record<string, HookCallbackMatcher[]>>;

// ── Adapter: wrap our typed callbacks into the generic SDK callback shape ──

function wrapHook<T extends HookInput>(fn: (input: T) => Promise<HookJSONOutput>): HookCallback {
    return (input, _toolUseID, _options) => fn(input as T);
}

// ── Public API ───────────────────────────────────────────────────────

export function createHooks(_options?: { cwd?: string }): { hooks: SDKHooks; supervisorState: SupervisorState } {
    const preCommitHook = wrapHook(createPreCommitHook());
    const rewritesHook = wrapHook(createRewritesHook());
    const guardsHook = wrapHook(createGuardsHook());
    const { state, preToolHook, postToolHook } = createSupervisorHooks();
    const supervisorPreHook = wrapHook(preToolHook);
    const supervisorPostHook = wrapHook(postToolHook);
    const postAgentValidationHook = wrapHook(createPostAgentValidationHook());
    const stopMetricsHook = wrapHook(handleStopMetrics);

    return {
        hooks: {
            PreToolUse: [{ matcher: "Bash", hooks: [preCommitHook, rewritesHook] }, { hooks: [guardsHook, supervisorPreHook] }],
            PostToolUse: [{ matcher: "Bash", hooks: [supervisorPostHook] }],
            Stop: [{ hooks: [stopMetricsHook] }],
            SubagentStop: [{ hooks: [postAgentValidationHook] }]
        },
        supervisorState: state
    };
}
