/** Step 2 (fix mode): Generate fix slices via fix-planner agent. */

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

/**
 * Run the fix-planner agent to generate one fix slice per issue.
 */
export async function runFixPlan(
    description: string,
    prNumber: number | undefined,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<void> {
    const header = prNumber ? `Generate fix slices for PR #${prNumber}.` : "Generate fix slices.";
    const prompt = [header, "", "Issues to fix:", description].join("\n");

    progress?.log("plan", "Starting fix planner");
    await runAgent("fix-planner", prompt, cwd, agents, progress, hooks);
    progress?.log("plan", "Fix plan complete");
}
