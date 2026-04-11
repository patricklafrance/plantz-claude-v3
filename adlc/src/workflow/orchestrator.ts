import { loadConfig, resolveConfig } from "../config.ts";
import { buildProjectContext, contextToPreamble } from "../context.ts";
import { validateRepository } from "../preflight.ts";
import { Progress, formatDuration } from "../progress.ts";
import { classifyReferenceDocs, loadAllAgents } from "./agents.ts";
import { runDocument } from "./steps/document.ts";
import { runMonitor } from "./steps/monitor.ts";
import { runPlacement } from "./steps/placement.ts";
import { runPlan } from "./steps/plan.ts";
import { runPr } from "./steps/pr.ts";
import { runSimplify } from "./steps/simplify.ts";
import { runSlices } from "./steps/slices/run-slices.ts";

export interface OrchestratorOptions {
    /** Target repository path. */
    cwd: string;
    /** Show wave schedule without executing. */
    dryRun?: boolean;
}

export async function run(featureDescription: string, options: OrchestratorOptions): Promise<void> {
    const { cwd } = options;
    const progress = new Progress();
    const startTime = Date.now();

    try {
        // Load and resolve config
        const rawConfig = await loadConfig(cwd);
        const config = resolveConfig(rawConfig);

        // Repository preflight — validates scripts and devDependencies
        validateRepository(cwd);

        // Build project context preamble (agent classifies reference docs, heuristics as fallback)
        const projectContext = await buildProjectContext(cwd, config, candidates => classifyReferenceDocs(candidates, cwd));
        const preamble = contextToPreamble(projectContext);

        const agents = loadAllAgents(preamble, config, cwd);

        // Step 1: Domain mapping + placement gate
        progress.log("plan", "Starting placement phase...");
        await runPlacement(featureDescription, cwd, agents, progress);

        // Step 2: Plan + adversarial challenge
        progress.log("plan", "Starting plan phase...");
        await runPlan(featureDescription, cwd, agents, progress);

        // Step 3: Slice execution
        progress.log("exec", "Starting slice execution...");
        await runSlices(cwd, config, preamble, options, progress);

        // Step 4-7: Post-processing
        await runSimplify(cwd, agents, progress);
        await runDocument(cwd, agents, progress);
        await runPr(featureDescription, cwd, agents, progress);
        await runMonitor(cwd, agents, progress);

        const elapsed = formatDuration(Date.now() - startTime);
        progress.log("done", `Feature complete in ${elapsed}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.error("fatal", message);
        process.exitCode = 1;
    }
}
