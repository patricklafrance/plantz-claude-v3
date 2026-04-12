/** Step 2: Plan draft with adversarial challenge loop. */

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
    for (let attempt = 0; attempt < DEFAULTS.maxPlanAttempts; attempt++) {
        const mode = attempt === 0 ? "draft" : "revision";
        progress?.log("plan", `Plan ${mode} attempt ${attempt + 1}/${DEFAULTS.maxPlanAttempts}`);

        // eslint-disable-next-line no-await-in-loop
        await runAgent(
            "planner",
            `${mode === "draft" ? "Draft" : "Revise"} the implementation plan for: ${featureDescription}`,
            cwd,
            agents,
            progress,
            hooks
        );

        // eslint-disable-next-line no-await-in-loop
        await runAgent("plan-gate", "Validate the plan structure.", cwd, agents, progress, hooks);

        // Adversarial challenge -- challengers in parallel
        // eslint-disable-next-line no-await-in-loop
        const [_cohesionResult, _sprawlResult] = await Promise.all([
            runAgent("cohesion-challenger", "Check extend decisions for god-module risk.", cwd, agents, progress, hooks),
            runAgent("sprawl-challenger", "Challenge create decisions with extension proposals.", cwd, agents, progress, hooks)
        ]);

        // Arbiter synthesizes
        // eslint-disable-next-line no-await-in-loop
        const verdict = await runAgent("challenge-arbiter", "Synthesize challenger debate into unified verdict.", cwd, agents, progress, hooks);

        const lower = verdict.toLowerCase();
        if (lower.includes("approved") && !lower.includes("revision required")) {
            progress?.log("plan", "Plan approved by arbiter");
            break;
        }

        progress?.log("plan", "Plan requires revision, restarting loop...");
    }
}
