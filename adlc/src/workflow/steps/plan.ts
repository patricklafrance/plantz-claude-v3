/** Step 2: Plan draft with plan-gate review loop. */

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULTS } from "../../config.ts";
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
    let plannerSessionId: string | undefined;

    for (let attempt = 0; attempt < DEFAULTS.maxPlanAttempts; attempt++) {
        // Clean stale gate revision so a passing gate isn't masked by a prior failure.
        rmSync(resolve(cwd, ".adlc", "plan-gate-revision.md"), { force: true });

        const mode = attempt === 0 ? "draft" : "revision";
        progress?.log("plan", `Plan ${mode} attempt ${attempt + 1}/${DEFAULTS.maxPlanAttempts}`);

        const plannerPrompt = mode === "draft"
            ? `Draft the implementation plan for: ${featureDescription}`
            : "Revise the implementation plan based on the plan gate feedback.";

        // eslint-disable-next-line no-await-in-loop
        const { sessionId } = await runAgent(
            "planner",
            plannerPrompt,
            cwd,
            agents,
            progress,
            hooks,
            plannerSessionId
        );
        plannerSessionId = sessionId;

        // eslint-disable-next-line no-await-in-loop
        await runAgent("plan-gate", "Validate the plan structure.", cwd, agents, progress, hooks);

        if (!existsSync(resolve(cwd, ".adlc", "plan-gate-revision.md"))) {
            progress?.log("plan", "Plan gate passed");
            break;
        }

        progress?.log("plan", "Plan requires revision, restarting loop...");
    }
}
