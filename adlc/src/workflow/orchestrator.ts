import { loadConfig, resolveConfig } from "../config.js";
import { buildProjectContext, contextToPreamble } from "../context.js";
import { validateRepository } from "../preflight.js";
import { Progress, formatDuration } from "../progress.js";
import { classifyReferenceDocs, loadAllAgents } from "./agents.js";
import { runDocument } from "./steps/document.js";
import { runMonitor } from "./steps/monitor.js";
import { runPlacement } from "./steps/placement.js";
import { runPlan } from "./steps/plan.js";
import { runPr } from "./steps/pr.js";
import { runSimplify } from "./steps/simplify.js";
import { runSlices } from "./steps/slices/run-slices.js";

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
