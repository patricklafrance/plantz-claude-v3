/** Step 1: Domain mapping with placement gate loop. */

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runPlacement(
    featureDescription: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<void> {
    progress?.log("plan", "Starting placement coordinator");

    await runAgent(
        "placement-coordinator",
        `Coordinate module placement for feature: ${featureDescription}`,
        cwd, agents, progress, hooks
    );

    progress?.log("plan", "Placement complete");
}
