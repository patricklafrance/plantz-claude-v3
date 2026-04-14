/** Step 3: DAG-aware wave execution with parallel slices. */

import { exec, execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import type { ResolvedConfig } from "../../../config.ts";
import { createHooks } from "../../../hooks/create-hooks.ts";
import { getRunDirName } from "../../../hooks/post-agent-validation/metrics.ts";
import type { Progress } from "../../../progress.ts";
import { runAgent, loadAllAgents } from "../../agents.ts";
import type { OrchestratorOptions } from "../../orchestrator.ts";
import { buildDAG } from "./dag/scheduler.ts";
import { runSlicePipeline } from "./revision-loop.ts";
import { collectResults } from "./worktree/collector.ts";
import { createWorktree, removeWorktreeAsync } from "./worktree/lifecycle.ts";
import { attemptMerge, completeMerge, abortMerge, hasUnmergedFiles, hasBranchDiverged } from "./worktree/merger.ts";
import { seedAdlc } from "./worktree/seeder.ts";

const execAsync = promisify(exec);

/** Check whether a local git branch already exists. */
function branchExists(name: string, cwd: string): boolean {
    try {
        execSync(`git rev-parse --verify "refs/heads/${name}"`, { cwd, stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

/** Create and checkout a new branch, appending a numeric suffix if the name is taken. */
function checkoutNewBranch(baseName: string, cwd: string): string {
    if (!branchExists(baseName, cwd)) {
        execSync(`git checkout -b "${baseName}"`, { cwd });
        return baseName;
    }
    for (let i = 2; i <= 99; i++) {
        const candidate = `${baseName}-${i}`;
        if (!branchExists(candidate, cwd)) {
            execSync(`git checkout -b "${candidate}"`, { cwd });
            return candidate;
        }
    }
    throw new Error(`Could not create branch "${baseName}" — all suffixes up to -99 are taken.`);
}

interface RunSlicesOptions extends OrchestratorOptions {
    /** Override feature branch detection (defaults to `git branch --show-current`). */
    featureBranch?: string;
}

export async function runSlices(
    cwd: string,
    config: ResolvedConfig,
    preamble: string,
    options: RunSlicesOptions,
    progress?: Progress
): Promise<void> {
    const runDirName = getRunDirName()!;
    const runDir = resolve(cwd, ".adlc", runDirName);
    const dag = buildDAG(resolve(runDir, "slices"));

    if (dag.nodes.length === 0) {
        throw new Error("No slice files found in the slices directory. The plan step must produce at least one slice before execution can proceed.");
    }

    const isFixMode = options.input.type === "fix-text" || options.input.type === "fix-pr";
    const coordinatorAgent = isFixMode ? "fix-slice-coordinator" : "feature-slice-coordinator";
    const coderAgent = isFixMode ? "fix-coder" : "feature-coder";

    if (options.dryRun) {
        for (const wave of dag.waves) {
            const names = wave.slices.map(s => s.name).join(", ");
            progress?.log(`wave-${wave.index}`, `${wave.slices.length} slice(s): ${names}`);
        }
        return;
    }

    // Create a dedicated integration branch for this run so slices
    // merge into it instead of directly into the base branch (e.g. main).
    const featureBranch = options.featureBranch ?? checkoutNewBranch(`adlc/${runDirName}`, cwd);
    const { hooks } = createHooks({ cwd });
    progress?.log("execution", `Feature branch: ${featureBranch}`);

    for (const wave of dag.waves) {
        progress?.wave(wave.index, wave.slices.length, wave.slices.length);

        // Create worktrees and zip with their slice metadata for unified access
        const waveItems = wave.slices.map(slice => {
            const wt = createWorktree(slice.name, featureBranch, cwd, runDir);
            progress?.slice(slice.name, "worktree", `created at ${wt.path}`);

            return { slice, wt };
        });

        try {
            // Seed .adlc/ and install deps in each worktree
            const priorNotes = getCompletedNotes(cwd, runDirName);
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(
                waveItems.map(async ({ slice, wt }) => {
                    const doneSetup = progress?.start("execution", `${slice.name}: seeding and installing deps`);

                    await seedAdlc(wt.path, {
                        runDirName,
                        planHeaderPath: resolve(runDir, "plan-header.md"),
                        domainMappingPath: resolve(runDir, "domain-mapping.md"),
                        slicesDir: resolve(runDir, "slices"),
                        sliceFilename: slice.filename,
                        priorImplementationNotes: priorNotes
                    });

                    await execAsync("pnpm install", { cwd: wt.path });

                    doneSetup?.();
                })
            );

            // Run slices in parallel
            // eslint-disable-next-line no-await-in-loop
            const results = await Promise.allSettled(
                waveItems.map(({ slice, wt }) => {
                    progress?.slice(slice.name, "pipeline", "starting");
                    return runSlicePipeline(slice.name, wt.path, preamble, config, cwd, progress, coordinatorAgent);
                })
            );

            // Check for supervisor kills — if ANY slice was killed by the
            // supervisor, abort the entire run. Continuing is wasteful since
            // slices have sequential dependencies and a killed slice signals
            // a systemic problem the next slice cannot avoid.
            for (const [i, { slice }] of waveItems.entries()) {
                const result = results[i];
                if (result.status === "fulfilled" && result.value.reason?.startsWith("supervisor:")) {
                    throw new Error(
                        `Run aborted: supervisor killed agent during slice "${slice.name}". ` +
                        `Reason: ${result.value.reason}. ` +
                        `Continuing would waste tokens on dependent slices that cannot succeed.`
                    );
                }
            }

            // Merge sequentially — resolve conflicts with coder agent
            for (const [i, { slice, wt }] of waveItems.entries()) {
                const result = results[i];
                if (result.status !== "fulfilled" || !result.value.success) {
                    const reason = result.status === "fulfilled" ? result.value.reason : String((result as PromiseRejectedResult).reason);
                    progress?.slice(slice.name, "merge", `skipped: ${reason}`);
                    continue;
                }

                // Guard: skip merge if the worktree branch has no new commits
                // (coordinator returned success but never committed).
                if (!hasBranchDiverged(wt.branch, featureBranch, cwd)) {
                    progress?.slice(slice.name, "merge", "skipped: worktree branch has no new commits");
                    continue;
                }

                progress?.slice(slice.name, "merge", "merging to feature branch");
                const mergeResult = attemptMerge(wt.branch, featureBranch, cwd);

                if (mergeResult.success) {
                    // eslint-disable-next-line no-await-in-loop
                    await safeCollectResults(wt.path, runDir, slice.name, runDirName, progress);
                    progress?.slice(slice.name, "merge", "merged cleanly");
                } else {
                    // Conflict — attempt agent-assisted resolution
                    const conflictFiles = mergeResult.conflictFiles ?? [];
                    progress?.slice(slice.name, "merge", `conflict in ${conflictFiles.join(", ")} — resolving`);

                    // eslint-disable-next-line no-await-in-loop
                    const resolved = await resolveConflicts(slice.name, conflictFiles, preamble, config, cwd, progress, hooks, coderAgent);

                    if (resolved && !hasUnmergedFiles(cwd)) {
                        completeMerge(cwd, `merge: resolve conflicts for ${slice.name}`);
                        // eslint-disable-next-line no-await-in-loop
                        await safeCollectResults(wt.path, runDir, slice.name, runDirName, progress);
                        progress?.slice(slice.name, "merge", "conflicts resolved");
                    } else {
                        abortMerge(cwd);
                        const detail = !resolved ? "agent failed" : "unresolved conflict markers remain";
                        progress?.slice(slice.name, "merge", `conflict unresolved (${detail}): ${conflictFiles.join(", ")}`);
                    }
                }
            }
        } finally {
            for (const { slice, wt } of waveItems) {
                // Fire-and-forget — must not crash the pipeline on cleanup failure.
                removeWorktreeAsync(wt.path, cwd).catch(() => {});
                progress?.slice(slice.name, "worktree", "cleanup started");
            }
        }
    }
}

/** Collect results from a worktree, logging a warning instead of crashing if it fails. */
async function safeCollectResults(
    worktreePath: string,
    mainRunDir: string,
    sliceName: string,
    runDirName: string,
    progress?: Progress
): Promise<void> {
    try {
        await collectResults(worktreePath, mainRunDir, sliceName, runDirName);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        progress?.slice(sliceName, "collect", `warning: failed to collect results — ${msg}`);
    }
}

/**
 * Spawn the coder agent to resolve merge conflict markers in the working tree.
 * Returns true if the agent succeeds (files staged, ready for commit).
 */
async function resolveConflicts(
    sliceName: string,
    conflictFiles: string[],
    preamble: string,
    config: ResolvedConfig,
    cwd: string,
    progress?: Progress,
    hooks?: ReturnType<typeof createHooks>["hooks"],
    coderAgent = "feature-coder"
): Promise<boolean> {
    try {
        const agents = loadAllAgents(preamble, config, cwd, getRunDirName()!);
        const prompt = [
            `You are resolving merge conflicts for slice "${sliceName}".`,
            "",
            "The following files have conflict markers (<<<<<<< / ======= / >>>>>>>):",
            ...conflictFiles.map(f => `- ${f}`),
            "",
            "Resolve each conflict preserving both sides' intent. After resolving, stage every resolved file with `git add`.",
            "Do NOT commit — just stage the resolved files."
        ].join("\n");

        await runAgent(coderAgent, prompt, cwd, agents, progress, hooks);

        return true;
    } catch {
        return false;
    }
}

/** Collect paths to all completed implementation notes from prior waves. */
function getCompletedNotes(cwd: string, runDirName: string): string[] {
    const notesDir = resolve(cwd, ".adlc", runDirName, "implementation-notes");
    try {
        return readdirSync(notesDir)
            .filter(f => f.endsWith(".md"))
            .map(f => join(notesDir, f));
    } catch {
        return [];
    }
}
