/** Step 6: Create pull request. */

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runPr(
    featureDescription: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<string> {
    progress?.log("post", "Creating pull request...");
    const { result } = await runAgent("pr", `Create PR for: ${featureDescription}`, cwd, agents, progress, hooks);

    // Extract the PR number from the agent's response.
    const match = result.match(/#?(\d+)/);
    return match?.[1] ?? "";
}
