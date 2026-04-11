/**
 * Local SDK hook types — keeps the module standalone and testable
 * without depending on @anthropic-ai/claude-agent-sdk at the type level.
 */

export interface PreToolUseHookInput {
    hook_event_name: "PreToolUse";
    session_id: string;
    transcript_path: string;
    cwd: string;
    agent_id?: string;
    agent_type?: string;
    tool_name: string;
    tool_input: unknown;
    tool_use_id: string;
}

export interface PostToolUseHookInput {
    hook_event_name: "PostToolUse";
    session_id: string;
    transcript_path: string;
    cwd: string;
    agent_id?: string;
    agent_type?: string;
    tool_name: string;
    tool_input: unknown;
    tool_response: unknown;
    tool_use_id: string;
}

export interface SubagentStopHookInput {
    hook_event_name: "SubagentStop";
    session_id: string;
    transcript_path: string;
    cwd: string;
    agent_id: string;
    agent_type: string;
    agent_transcript_path: string;
    stop_hook_active: boolean;
    last_assistant_message?: string;
}

export interface HookSpecificPreToolUse {
    hookEventName: "PreToolUse";
    permissionDecision?: "allow" | "deny" | "ask" | "defer";
    permissionDecisionReason?: string;
    additionalContext?: string;
    updatedInput?: Record<string, unknown>;
}

export interface HookSpecificPostToolUse {
    hookEventName: "PostToolUse";
    additionalContext?: string;
}

export interface HookJSONOutput {
    continue?: boolean;
    suppressOutput?: boolean;
    stopReason?: string;
    decision?: "approve" | "block";
    reason?: string;
    hookSpecificOutput?: HookSpecificPreToolUse | HookSpecificPostToolUse;
}
