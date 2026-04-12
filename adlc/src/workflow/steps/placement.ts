/** Step 1: Domain mapping with placement gate loop. */

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULTS } from "../../config.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runPlacement(
    featureDescription: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress
): Promise<void> {
    // Ensure the .adlc directory structure exists before agents run
    const adlcRoot = resolve(cwd, ".adlc");
    mkdirSync(resolve(adlcRoot, "slices"), { recursive: true });
    mkdirSync(resolve(adlcRoot, "implementation-notes"), { recursive: true });
    mkdirSync(resolve(adlcRoot, "verification-results"), { recursive: true });

    for (let attempt = 0; attempt < DEFAULTS.maxDomainMappingAttempts; attempt++) {
        progress?.log("plan", `Domain mapping attempt ${attempt + 1}/${DEFAULTS.maxDomainMappingAttempts}`);

        // eslint-disable-next-line no-await-in-loop
        await runAgent("domain-mapper", `Map modules for feature: ${featureDescription}`, cwd, agents, progress);

        // eslint-disable-next-line no-await-in-loop
        const gateResult = await runAgent("placement-gate", "Validate the domain mapping.", cwd, agents, progress);

        if (!gateResult.toLowerCase().includes("issue")) {
            progress?.log("plan", "Placement gate passed");
            break;
        }

        // Evidence gaps -- resolve and re-map
        progress?.log("plan", "Placement gate found issues, running evidence researcher...");
        // eslint-disable-next-line no-await-in-loop
        await runAgent("evidence-researcher", "Resolve evidence gaps identified by the placement gate.", cwd, agents, progress);
    }
}
