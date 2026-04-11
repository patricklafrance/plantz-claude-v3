/**
 * Post-agent checks hook — wraps the per-agent-type check handlers
 * into a SubagentStop callback.
 *
 * When an ADLC subagent signals completion, this hook runs the matching
 * handler's checks. If any problems are found, the agent is sent back
 * with the problem list. If stop_hook_active is true, the agent is
 * already in a retry cycle — let it through to avoid infinite loops.
 */

import type { HookJSONOutput, SubagentStopHookInput } from "../types.ts";
import { handleChallengeArbiter } from "./challenge-arbiter/handler.ts";
import { handleCoder } from "./coder/handler.ts";
import { handleDocument } from "./document/handler.ts";
import { handleModuleMapper } from "./domain-mapper/handler.ts";
import { handleEvidenceResearcher } from "./evidence-researcher/handler.ts";
import { archiveArtifacts, recordMetrics } from "./metrics.ts";
import { handlePlacementGate } from "./placement-gate/handler.ts";
import { handlePlanGate } from "./plan-gate/handler.ts";
import { handlePlanner } from "./planner/handler.ts";
import { handleReviewer } from "./reviewer/handler.ts";
import { handleSimplify } from "./simplify/handler.ts";

type HandlerFn = (cwd: string) => string[] | Promise<string[]>;

const handlers: Record<string, HandlerFn> = {
    "challenge-arbiter": handleChallengeArbiter,
    coder: handleCoder,
    document: handleDocument,
    "domain-mapper": handleModuleMapper,
    "evidence-researcher": handleEvidenceResearcher,
    "placement-gate": handlePlacementGate,
    "plan-gate": handlePlanGate,
    planner: handlePlanner,
    reviewer: handleReviewer,
    simplify: handleSimplify
};

export function createPostAgentValidationHook() {
    return async (input: SubagentStopHookInput): Promise<HookJSONOutput> => {
        const { agent_type: agentType, agent_transcript_path: transcriptPath, cwd } = input;

        // Already in a retry cycle — record metrics and let through to avoid infinite loops.
        if (input.stop_hook_active) {
            recordMetrics(transcriptPath, agentType, cwd);
            return { continue: true };
        }

        const handler = handlers[agentType];
        if (!handler) {
            recordMetrics(transcriptPath, agentType, cwd);
            return { continue: true };
        }

        const problems = await handler(cwd);
        if (problems.length === 0) {
            recordMetrics(transcriptPath, agentType, cwd);
            archiveArtifacts(agentType, cwd);
            return { continue: true };
        }

        return {
            decision: "block",
            reason: `${agentType} post-completion checks failed.\n\n${problems.join("\n\n")}`
        };
    };
}
