/** Step 2: Plan draft with plan-gate review loop. */

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runPlan(
    featureDescription: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<void> {
    progress?.log("plan", "Starting plan coordinator");

    await runAgent(
        "plan-coordinator",
        `Coordinate implementation planning for feature: ${featureDescription}`,
        cwd, agents, progress, hooks
    );

    progress?.log("plan", "Plan complete");
}
