/**
 * Supervisor hooks factory — creates shared state and returns
 * the PreToolUse and PostToolUse hook pair.
 */

import { createSupervisorPostToolHook } from "./create-supervisor-post-tool-hook.js";
import { createSupervisorPreToolHook } from "./create-supervisor-pre-tool-hook.js";
import { createDefaultState } from "./state.js";

export function createSupervisorHooks() {
    const state = createDefaultState();
    return {
        state,
        preToolHook: createSupervisorPreToolHook(state),
        postToolHook: createSupervisorPostToolHook(state)
    };
}
