import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig, resolveConfig } from "../config.ts";
import { buildProjectContext, contextToPreamble } from "../context.ts";
import { createHooks } from "../hooks/create-hooks.ts";
import { validateRepository } from "../preflight.ts";
import { Progress } from "../progress.ts";
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

    progress.banner(featureDescription, PKG.version);

    try {
        const doneInit = progress.init();

        const doneConfig = progress.start("init", "Loading configuration");
        const rawConfig = await loadConfig(cwd);
        const config = resolveConfig(rawConfig);
        doneConfig();

        const doneValidate = progress.start("init", "Validating repository");
        validateRepository(cwd);
        doneValidate();

        const doneDirs = progress.start("init", "Preparing workspace");
        const adlcRoot = resolve(cwd, ".adlc");
        mkdirSync(resolve(adlcRoot, "slices"), { recursive: true });
        mkdirSync(resolve(adlcRoot, "implementation-notes"), { recursive: true });
        mkdirSync(resolve(adlcRoot, "verification-results"), { recursive: true });
        mkdirSync(resolve(cwd, ".adlc-logs"), { recursive: true });
        doneDirs();

        const doneScan = progress.start("init", "Scanning project files");
        const projectContext = await buildProjectContext(cwd, config, async candidates => {
            doneScan();
            const doneClassify = progress.start("init", "Classifying reference docs");
            const result = await classifyReferenceDocs(candidates, cwd, progress);
            doneClassify();

            return result;
        });
        const preamble = contextToPreamble(projectContext);

        const doneAgents = progress.start("init", "Loading agent definitions");
        const agents = loadAllAgents(preamble, config, cwd);
        doneAgents();

        doneInit();

        // Fresh hooks per step — supervisor state (browser thrash counters,
        // wall-clock timers, install bypass tokens) must not leak across steps.

        // Step 1: Domain mapping + placement gate
        const donePlacement = progress.step(1, "Placement");
        await runPlacement(featureDescription, cwd, agents, progress, createHooks({ cwd }).hooks);
        donePlacement();

        // Step 2: Plan + adversarial challenge
        const donePlan = progress.step(2, "Plan");
        await runPlan(featureDescription, cwd, agents, progress, createHooks({ cwd }).hooks);
        donePlan();

        // Step 3: Slice execution (creates its own hooks per slice pipeline)
        const doneExecution = progress.step(3, "Execution");
        await runSlices(cwd, config, preamble, options, progress);
        doneExecution();

        // Step 4: Simplify
        const doneSimplify = progress.step(4, "Simplify");
        await runSimplify(cwd, agents, progress, createHooks({ cwd }).hooks);
        doneSimplify();

        // Step 5: Document
        const doneDocument = progress.step(5, "Document");
        await runDocument(cwd, agents, progress, createHooks({ cwd }).hooks);
        doneDocument();

        // Step 6: Pull Request
        const donePR = progress.step(6, "Pull Request");
        await runPr(featureDescription, cwd, agents, progress, createHooks({ cwd }).hooks);
        donePR();

        // Step 7: Monitor CI
        const doneMonitor = progress.step(7, "Monitor CI");
        await runMonitor(cwd, agents, progress, createHooks({ cwd }).hooks);
        doneMonitor();

        progress.done();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.fatal(message);
        process.exitCode = 1;
    }
}
