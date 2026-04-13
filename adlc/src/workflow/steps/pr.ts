/** Step 6: Create pull request (feature mode) or update existing PR (fix mode). */

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import type { FixTarget } from "../orchestrator.ts";
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

export async function runPrUpdate(
    fix: FixTarget,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<string> {
    const prompt = [
        `Update PR #${fix.prNumber} with fix results.`,
        "",
        "Fixed issues:",
        fix.description,
        "",
        "Mode: fix"
    ].join("\n");

    progress?.log("post", `Updating PR #${fix.prNumber} with fix results...`);
    await runAgent("pr", prompt, cwd, agents, progress, hooks);

    return String(fix.prNumber);
}
