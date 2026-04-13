/** Step 2: Plan draft with adversarial challenge loop. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULTS } from "../../config.ts";
import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

function readVerdictStatus(cwd: string): "approved" | "revision-required" | "unknown" {
    try {
        const content = readFileSync(
            resolve(cwd, ".adlc", "current-challenge-verdict.md"), "utf-8"
        );
        const statusMatch = content.match(/^##\s+Status\s*\n+(.+)/im);
        if (!statusMatch) return "unknown";
        const status = statusMatch[1].trim().toLowerCase();
        if (status.startsWith("approved")) return "approved";
        if (status.startsWith("revision required")) return "revision-required";
        return "unknown";
    } catch {
        return "unknown";
    }
}

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

        // Adversarial challenge -- domain-challenger orchestrates the team
        // eslint-disable-next-line no-await-in-loop
        await runAgent(
            "domain-challenger",
            "Run the adversarial challenge debate and produce a verdict.",
            cwd, agents, progress, hooks
        );

        if (readVerdictStatus(cwd) === "approved") {
            progress?.log("plan", "Plan approved by arbiter");
            break;
        }

        progress?.log("plan", "Plan requires revision, restarting loop...");
    }
}
