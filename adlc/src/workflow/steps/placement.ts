/** Step 1: Domain mapping with placement gate loop. */

import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULTS } from "../../config.ts";
import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

/** Remove stale gate/verdict files so a fresh iteration starts clean. */
function cleanPlacementArtifacts(cwd: string): void {
    const stale = ["placement-gate-revision.md", "current-challenge-verdict.md", "current-evidence-findings.md"];
    for (const name of stale) {
        rmSync(resolve(cwd, ".adlc", name), { force: true });
    }
}

export async function runPlacement(
    featureDescription: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<void> {
    for (let attempt = 0; attempt < DEFAULTS.maxDomainMappingAttempts; attempt++) {
        cleanPlacementArtifacts(cwd);
        progress?.log("plan", `Domain mapping attempt ${attempt + 1}/${DEFAULTS.maxDomainMappingAttempts}`);

        // eslint-disable-next-line no-await-in-loop
        await runAgent("domain-mapper", `Map modules for feature: ${featureDescription}`, cwd, agents, progress, hooks);

        // Resolve evidence gaps before the adversarial challenge
        // eslint-disable-next-line no-await-in-loop
        await runAgent("evidence-researcher", "Resolve evidence gaps identified in the domain mapping.", cwd, agents, progress, hooks);

        // Adversarial challenge -- domain-challenger orchestrates the team
        // eslint-disable-next-line no-await-in-loop
        await runAgent(
            "domain-challenger",
            "Run the adversarial challenge debate and produce a verdict.",
            cwd, agents, progress, hooks
        );

        // eslint-disable-next-line no-await-in-loop
        await runAgent("placement-gate", "Validate the domain mapping.", cwd, agents, progress, hooks);

        if (!existsSync(resolve(cwd, ".adlc", "placement-gate-revision.md"))) {
            progress?.log("plan", "Placement gate passed");
            break;
        }

        progress?.log("plan", "Placement gate found issues, retrying...");
    }
}
