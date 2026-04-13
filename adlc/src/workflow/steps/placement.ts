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
    let mapperSessionId: string | undefined;

    for (let attempt = 0; attempt < DEFAULTS.maxDomainMappingAttempts; attempt++) {
        cleanPlacementArtifacts(cwd);
        const mode = attempt === 0 ? "draft" : "revision";
        progress?.log("plan", `Domain mapping ${mode} attempt ${attempt + 1}/${DEFAULTS.maxDomainMappingAttempts}`);

        const mapperPrompt = mode === "draft"
            ? `Map modules for feature: ${featureDescription}`
            : "Revise the domain mapping based on the placement gate feedback and challenge verdict.";

        // eslint-disable-next-line no-await-in-loop
        const { sessionId } = await runAgent("domain-mapper", mapperPrompt, cwd, agents, progress, hooks, mapperSessionId);
        mapperSessionId = sessionId;

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
