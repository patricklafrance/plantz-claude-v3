/**
 * Supervisor hooks factory — creates shared state and returns
 * the PreToolUse and PostToolUse hook pair.
 */

import { createSupervisorPostToolHook } from "./create-supervisor-post-tool-hook.ts";
import { createSupervisorPreToolHook } from "./create-supervisor-pre-tool-hook.ts";
import { createDefaultState } from "./state.ts";

export function createSupervisorHooks() {
    const state = createDefaultState();
    return {
        state,
        preToolHook: createSupervisorPreToolHook(state),
        postToolHook: createSupervisorPostToolHook(state)
    };
}
