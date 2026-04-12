import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig, resolveConfig } from "../config.ts";
import { buildProjectContext, contextToPreamble } from "../context.ts";
import { createHooks } from "../hooks/create-hooks.ts";
import { initLogsDir } from "../hooks/post-agent-validation/metrics.ts";
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

/**
 * Remove stale state files from .adlc/ so a fresh run starts clean.
 * Only touches known workflow artifacts — leaves the directory itself
 * and any unknown files intact.
 */
export function cleanAdlcState(adlcRoot: string): void {
    if (!existsSync(adlcRoot)) {
        return;
    }

    // Individual state files produced by agents / hooks.
    const staleFiles = [
        "domain-mapping.md",
        "plan-header.md",
        "current-challenge-verdict.md",
        "current-evidence-findings.md",
        "current-explorer-summary.md",
        "placement-gate-revision.md",
        "plan-gate-revision.md",
        "allow-install",
        "metrics-dir",
        "current-slice.md"
    ];

    for (const name of staleFiles) {
        const filePath = resolve(adlcRoot, name);
        if (existsSync(filePath)) {
            rmSync(filePath);
        }
    }

    // Directories whose contents are fully regenerated each run.
    const staleDirs = ["slices", "implementation-notes", "verification-results"];

    for (const name of staleDirs) {
        const dirPath = resolve(adlcRoot, name);
        if (!existsSync(dirPath)) {
            continue;
        }

        for (const entry of readdirSync(dirPath)) {
            rmSync(resolve(dirPath, entry), { recursive: true });
        }
    }
}

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

    let runDir: string | undefined;

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
        cleanAdlcState(adlcRoot);
        mkdirSync(resolve(adlcRoot, "slices"), { recursive: true });
        mkdirSync(resolve(adlcRoot, "implementation-notes"), { recursive: true });
        mkdirSync(resolve(adlcRoot, "verification-results"), { recursive: true });
        mkdirSync(resolve(cwd, ".adlc-logs"), { recursive: true });
        runDir = initLogsDir(cwd);
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

        if (options.dryRun) {
            progress.done();

            return;
        }

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
    } finally {
        // Move SDK streaming log into the run subfolder if it exists.
        try {
            const sdkLog = resolve(cwd, ".adlc-logs", "sdk-messages.jsonl");
            if (runDir && existsSync(sdkLog)) {
                renameSync(sdkLog, resolve(runDir, "sdk-messages.jsonl"));
            }
        } catch {
            // Best-effort — don't fail the pipeline over a log file.
        }
    }
}
