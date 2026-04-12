import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8")) as { version: string };

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

    progress.banner(featureDescription, PKG.version);

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
        const donePlacement = progress.step(1, "Placement");
        await runPlacement(featureDescription, cwd, agents, progress);
        donePlacement();

        // Step 2: Plan + adversarial challenge
        const donePlan = progress.step(2, "Plan");
        await runPlan(featureDescription, cwd, agents, progress);
        donePlan();

        // Step 3: Slice execution
        const doneExecution = progress.step(3, "Execution");
        await runSlices(cwd, config, preamble, options, progress);
        doneExecution();

        // Step 4: Simplify
        const doneSimplify = progress.step(4, "Simplify");
        await runSimplify(cwd, agents, progress);
        doneSimplify();

        // Step 5: Document
        const doneDocument = progress.step(5, "Document");
        await runDocument(cwd, agents, progress);
        doneDocument();

        // Step 6: Pull Request
        const donePR = progress.step(6, "Pull Request");
        await runPr(featureDescription, cwd, agents, progress);
        donePR();

        // Step 7: Monitor CI
        const doneMonitor = progress.step(7, "Monitor CI");
        await runMonitor(cwd, agents, progress);
        doneMonitor();

        const elapsed = formatDuration(Date.now() - startTime);
        progress.done(elapsed);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.fatal(message);
        process.exitCode = 1;
    }
}
