import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig, resolveConfig } from "../config.ts";
import { buildProjectContext, contextToPreamble } from "../context.ts";
import { createHooks } from "../hooks/create-hooks.ts";
import { getRunDirName, initRunDir } from "../hooks/post-agent-validation/metrics.ts";
import { validateCleanState, validateRepository } from "../preflight.ts";
import { Progress } from "../progress.ts";
import { classifyReferenceDocs, loadAllAgents } from "./agents.ts";
import { runDocument } from "./steps/document.ts";
import { runFixPlan } from "./steps/fix-plan.ts";
import { type PipelineInput, runGather } from "./steps/gather.ts";
import { runMonitor } from "./steps/monitor.ts";
import { runPlacement } from "./steps/placement.ts";
import { runPlan } from "./steps/plan.ts";
import { runPr, runPrUpdate } from "./steps/pr.ts";
import { runSimplify } from "./steps/simplify.ts";
import { runSlices } from "./steps/slices/run-slices.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8")) as { version: string };

function assertNoSupervisorKill(stepName: string, fatalReason: string | null): void {
    if (fatalReason) {
        throw new Error(`Run aborted: supervisor killed agent during "${stepName}". Reason: ${fatalReason}`);
    }
}

export type { PipelineInput };

export interface FixTarget {
    /** PR number to update. */
    prNumber: number;
    /** Free-form text describing the issues that were fixed. */
    description: string;
}

export interface OrchestratorOptions {
    /** Target repository path. */
    cwd: string;
    /** Show wave schedule without executing. */
    dryRun?: boolean;
    /** Pipeline input — determines mode and data source. */
    input: PipelineInput;
}

/**
 * Verify that at least one slice produced implementation notes.
 * Returns true if implementation results exist, false otherwise.
 */
function hasImplementationResults(cwd: string, runDirName: string): boolean {
    const notesDir = resolve(cwd, ".adlc", runDirName, "implementation-notes");

    if (!existsSync(notesDir)) {
        return false;
    }

    const files = readdirSync(notesDir).filter(f => f.endsWith(".md"));

    return files.length > 0;
}

function getBannerLabel(input: PipelineInput): string {
    switch (input.type) {
        case "feat-text":
            return input.description;
        case "feat-issue":
            return `Issue #${input.issueNumber}`;
        case "fix-text":
            return input.description;
        case "fix-pr":
            return `Fix PR #${input.prNumber}`;
    }
}

export async function run(options: OrchestratorOptions): Promise<void> {
    const { cwd } = options;
    const progress = new Progress();

    progress.banner(getBannerLabel(options.input), PKG.version);

    let runDir: string | undefined;

    try {
        const doneInit = progress.init();

        const doneConfig = progress.start("init", "Loading configuration");
        const rawConfig = await loadConfig(cwd);
        const config = resolveConfig(rawConfig);
        doneConfig();

        const doneValidate = progress.start("init", "Validating repository");
        validateRepository(cwd, resolve(cwd, config.structure.reference));
        doneValidate();

        const doneClean = progress.start("init", "Checking lint & test baseline");
        validateCleanState(cwd);
        doneClean();

        const doneDirs = progress.start("init", "Preparing workspace");
        runDir = initRunDir(cwd);
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
        const agents = loadAllAgents(preamble, config, cwd, getRunDirName()!);
        doneAgents();

        doneInit();

        // Fresh hooks per step — supervisor state (browser thrash counters,
        // wall-clock timers, install bypass tokens) must not leak across steps.
        // After each step, check if the supervisor killed the agent and abort.
        function freshHooks() {
            return createHooks({ cwd });
        }

        function warnSupervisorKill(stepName: string, fatalReason: string | null): void {
            if (fatalReason) {
                progress.log("supervisor", `Warning: agent killed during "${stepName}" (${fatalReason}) — code is already committed, continuing.`);
            }
        }

        // Step 0: Gather — resolve input into a description string.
        const doneGather = progress.step(0, "Gather");
        const gatherHooks = freshHooks();
        const { description } = await runGather(options.input, runDir!, cwd, agents, progress, gatherHooks.hooks);
        assertNoSupervisorKill("gather", gatherHooks.supervisorState.fatalReason);
        doneGather();

        const { input } = options;

        if (input.type === "fix-text" || input.type === "fix-pr") {
            // Fix mode: skip placement, use fix-planner instead of feature planner.
            const doneFixPlan = progress.step(1, "Fix Plan");
            const fixPlanHooks = freshHooks();
            await runFixPlan(description, input.type === "fix-pr" ? input.prNumber : undefined, cwd, agents, progress, fixPlanHooks.hooks);
            assertNoSupervisorKill("fix-plan", fixPlanHooks.supervisorState.fatalReason);
            doneFixPlan();

            // Step 2: Slice execution (creates its own hooks per slice pipeline)
            const doneExecution = progress.step(2, "Execution");
            await runSlices(cwd, config, preamble, options, progress);
            doneExecution();

            if (options.dryRun) {
                progress.done();

                return;
            }

            if (!hasImplementationResults(cwd, getRunDirName()!)) {
                throw new Error("Execution produced no implementation results. No slices were successfully implemented — aborting pipeline.");
            }

            // Post-code steps: supervisor kills are warnings, not fatal.
            // Code is already committed — aborting here would lose a fully-implemented feature.

            // Step 3: Simplify
            const doneSimplify = progress.step(3, "Simplify");
            const fixSimplifyHooks = freshHooks();
            await runSimplify(cwd, agents, progress, fixSimplifyHooks.hooks);
            warnSupervisorKill("simplify", fixSimplifyHooks.supervisorState.fatalReason);
            doneSimplify();

            let prNumber: string;

            if (input.type === "fix-pr") {
                // Step 4: PR Update — push fix results to the existing PR.
                const donePrUpdate = progress.step(4, "PR Update");
                const prUpdateHooks = freshHooks();
                prNumber = await runPrUpdate({ prNumber: input.prNumber, description }, cwd, agents, progress, prUpdateHooks.hooks);
                warnSupervisorKill("pr-update", prUpdateHooks.supervisorState.fatalReason);
                donePrUpdate();
            } else {
                // Step 4: Pull Request — create a new PR for the fix.
                const donePR = progress.step(4, "Pull Request");
                const fixPrHooks = freshHooks();
                prNumber = await runPr(description, cwd, agents, progress, fixPrHooks.hooks);
                warnSupervisorKill("pull-request", fixPrHooks.supervisorState.fatalReason);
                donePR();
            }

            // Step 5: Monitor CI
            const doneMonitor = progress.step(5, "Monitor CI");
            const fixMonitorHooks = freshHooks();
            await runMonitor(cwd, agents, progress, fixMonitorHooks.hooks, prNumber);
            warnSupervisorKill("monitor", fixMonitorHooks.supervisorState.fatalReason);
            doneMonitor();
        } else {
            // Step 1: Domain mapping + placement gate
            const donePlacement = progress.step(1, "Placement");
            const placementHooks = freshHooks();
            await runPlacement(description, cwd, agents, progress, placementHooks.hooks);
            assertNoSupervisorKill("placement", placementHooks.supervisorState.fatalReason);
            donePlacement();

            // Step 2: Plan + adversarial challenge
            const donePlan = progress.step(2, "Plan");
            const planHooks = freshHooks();
            await runPlan(description, cwd, agents, progress, planHooks.hooks);
            assertNoSupervisorKill("plan", planHooks.supervisorState.fatalReason);
            donePlan();

            // Step 3: Slice execution (creates its own hooks per slice pipeline)
            const doneExecution = progress.step(3, "Execution");
            await runSlices(cwd, config, preamble, options, progress);
            doneExecution();

            if (options.dryRun) {
                progress.done();

                return;
            }

            if (!hasImplementationResults(cwd, getRunDirName()!)) {
                throw new Error("Execution produced no implementation results. No slices were successfully implemented — aborting pipeline.");
            }

            // Post-code steps: supervisor kills are warnings, not fatal.
            // Code is already committed — aborting here would lose a fully-implemented feature.

            // Step 4: Simplify
            const doneSimplify = progress.step(4, "Simplify");
            const simplifyHooks = freshHooks();
            await runSimplify(cwd, agents, progress, simplifyHooks.hooks);
            warnSupervisorKill("simplify", simplifyHooks.supervisorState.fatalReason);
            doneSimplify();

            // Step 5: Document
            const doneDocument = progress.step(5, "Document");
            const documentHooks = freshHooks();
            await runDocument(cwd, agents, progress, documentHooks.hooks);
            warnSupervisorKill("document", documentHooks.supervisorState.fatalReason);
            doneDocument();

            // Step 6: Pull Request
            const donePR = progress.step(6, "Pull Request");
            const prHooks = freshHooks();
            const prNumber = await runPr(description, cwd, agents, progress, prHooks.hooks);
            warnSupervisorKill("pull-request", prHooks.supervisorState.fatalReason);
            donePR();

            // Step 7: Monitor CI
            const doneMonitor = progress.step(7, "Monitor CI");
            const monitorHooks = freshHooks();
            await runMonitor(cwd, agents, progress, monitorHooks.hooks, prNumber);
            warnSupervisorKill("monitor", monitorHooks.supervisorState.fatalReason);
            doneMonitor();
        }

        progress.done();
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        progress.fatal(message);
        process.exitCode = 1;
    }
}
