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
import { recordMetrics } from "./metrics.ts";
import { handlePlacementGate } from "./placement-gate/handler.ts";
import { handlePlanGate } from "./plan-gate/handler.ts";
import { handlePlanner } from "./planner/handler.ts";
import { handleReviewer } from "./reviewer/handler.ts";

type HandlerFn = (cwd: string) => string[] | Promise<string[]>;

const handlers: Record<string, HandlerFn> = {
    "challenge-arbiter": handleChallengeArbiter,
    document: handleDocument,
    "domain-mapper": handleModuleMapper,
    "evidence-researcher": handleEvidenceResearcher,
    "placement-gate": handlePlacementGate,
    "plan-gate": handlePlanGate,
    "feature-planner": handlePlanner,
    "fix-planner": handlePlanner,
    "feature-reviewer": handleReviewer,
    "fix-reviewer": handleReviewer
};

export function createPostAgentValidationHook() {
    /** In-memory markers shared across agent runs within the same pipeline. */
    const markers: Record<string, boolean> = {};

    return async (input: SubagentStopHookInput): Promise<HookJSONOutput> => {
        const { agent_type: agentType, agent_transcript_path: transcriptPath, cwd } = input;

        const isCoderAgent = agentType === "feature-coder" || agentType === "fix-coder";
        const handler = isCoderAgent ? (dir: string) => handleCoder(dir, markers) : handlers[agentType];

        if (!handler) {
            recordMetrics(transcriptPath, agentType, cwd);
            return { continue: true };
        }

        const problems = await handler(cwd);
        if (problems.length === 0) {
            recordMetrics(transcriptPath, agentType, cwd);
            return { continue: true };
        }

        return {
            decision: "block",
            reason: `${agentType} post-completion checks failed.\n\n${problems.join("\n\n")}`
        };
    };
}
