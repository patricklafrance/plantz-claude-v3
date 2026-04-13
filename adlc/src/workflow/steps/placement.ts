/** Step 1: Domain mapping with placement gate loop. */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { DEFAULTS } from "../../config.ts";
import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runPlacement(
    featureDescription: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<void> {
    for (let attempt = 0; attempt < DEFAULTS.maxDomainMappingAttempts; attempt++) {
        progress?.log("plan", `Domain mapping attempt ${attempt + 1}/${DEFAULTS.maxDomainMappingAttempts}`);

        // eslint-disable-next-line no-await-in-loop
        await runAgent("domain-mapper", `Map modules for feature: ${featureDescription}`, cwd, agents, progress, hooks);

        // eslint-disable-next-line no-await-in-loop
        await runAgent("placement-gate", "Validate the domain mapping.", cwd, agents, progress, hooks);

        if (!existsSync(resolve(cwd, ".adlc", "placement-gate-revision.md"))) {
            progress?.log("plan", "Placement gate passed");
            break;
        }

        // Evidence gaps -- resolve and re-map
        progress?.log("plan", "Placement gate found issues, running evidence researcher...");
        // eslint-disable-next-line no-await-in-loop
        await runAgent("evidence-researcher", "Resolve evidence gaps identified by the placement gate.", cwd, agents, progress, hooks);
    }
}
