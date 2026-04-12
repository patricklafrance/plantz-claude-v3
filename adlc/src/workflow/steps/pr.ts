/** Step 6: Create pull request. */

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runPr(featureDescription: string, cwd: string, agents: Record<string, AgentDefinition>, progress?: Progress, hooks?: SDKHooks): Promise<void> {
    progress?.log("post", "Creating pull request...");
    await runAgent("pr", `Create PR for: ${featureDescription}`, cwd, agents, progress, hooks);
}
