/** Step 3: DAG-aware wave execution with parallel slices. */

import { exec, execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import type { ResolvedConfig } from "../../../config.ts";
import { allocatePorts } from "../../../ports.ts";
import type { Progress } from "../../../progress.ts";
import { runAgent, loadAllAgents } from "../../agents.ts";
import type { OrchestratorOptions } from "../../orchestrator.ts";
import { buildDAG } from "./dag/scheduler.ts";
import { runSlicePipeline } from "./revision-loop.ts";
import { collectResults } from "./worktree/collector.ts";
import { createWorktree, removeWorktree } from "./worktree/lifecycle.ts";
import { attemptMerge, completeMerge, abortMerge } from "./worktree/merger.ts";
import { seedAdlc } from "./worktree/seeder.ts";

const execAsync = promisify(exec);

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
    const dag = buildDAG(resolve(cwd, ".adlc/slices"));

    if (options.dryRun) {
        for (const wave of dag.waves) {
            const names = wave.slices.map(s => s.name).join(", ");
            progress?.log(`wave-${wave.index}`, `${wave.slices.length} slice(s): ${names}`);
        }
        return;
    }

    const featureBranch = options.featureBranch ?? execSync("git branch --show-current", { cwd, encoding: "utf8" }).trim();
    progress?.log("execution", `Feature branch: ${featureBranch}`);

    for (const wave of dag.waves) {
        progress?.wave(wave.index, wave.slices.length, wave.slices.length);

        // Create worktrees and zip with their slice metadata for unified access
        const waveItems = wave.slices.map(slice => {
            const wt = createWorktree(slice.name, featureBranch, cwd);
            progress?.slice(slice.name, "worktree", `created at ${wt.path}`);

            return { slice, wt };
        });

        try {
            // Seed .adlc/ and install deps in each worktree
            const priorNotes = getCompletedNotes(cwd);
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(
                waveItems.map(async ({ slice, wt }) => {
                    const doneSetup = progress?.start("execution", `${slice.name}: seeding and installing deps`);

                    await seedAdlc(wt.path, {
                        planHeaderPath: resolve(cwd, ".adlc/plan-header.md"),
                        domainMappingPath: resolve(cwd, ".adlc/domain-mapping.md"),
                        slicesDir: resolve(cwd, ".adlc/slices"),
                        sliceFilename: slice.filename,
                        priorImplementationNotes: priorNotes
                    });

                    await execAsync("pnpm install", { cwd: wt.path });

                    doneSetup?.();
                })
            );

            // Run slices in parallel
            const ports = waveItems.map((_, i) => allocatePorts(i, config.ports));
            // eslint-disable-next-line no-await-in-loop
            const results = await Promise.allSettled(
                waveItems.map(({ slice, wt }, i) => {
                    progress?.slice(slice.name, "pipeline", "starting");
                    return runSlicePipeline(slice.name, wt.path, ports[i], preamble, config, cwd, progress);
                })
            );

            // Merge sequentially — resolve conflicts with coder agent
            for (const [i, { slice, wt }] of waveItems.entries()) {
                const result = results[i];
                if (result.status === "fulfilled" && result.value.success) {
                    progress?.slice(slice.name, "merge", "merging to feature branch");
                    const mergeResult = attemptMerge(wt.branch, featureBranch, cwd);

                    if (mergeResult.success) {
                        // eslint-disable-next-line no-await-in-loop
                        await collectResults(wt.path, resolve(cwd, ".adlc"), slice.name);
                        progress?.slice(slice.name, "merge", "merged cleanly");
                    } else {
                        // Conflict — attempt agent-assisted resolution
                        const conflictFiles = mergeResult.conflictFiles ?? [];
                        progress?.slice(slice.name, "merge", `conflict in ${conflictFiles.join(", ")} — resolving`);

                        // eslint-disable-next-line no-await-in-loop
                        const resolved = await resolveConflicts(slice.name, conflictFiles, preamble, config, cwd, progress);
                        if (resolved) {
                            completeMerge(cwd, `merge: resolve conflicts for ${slice.name}`);
                            // eslint-disable-next-line no-await-in-loop
                            await collectResults(wt.path, resolve(cwd, ".adlc"), slice.name);
                            progress?.slice(slice.name, "merge", "conflicts resolved");
                        } else {
                            abortMerge(cwd);
                            progress?.slice(slice.name, "merge", `conflict unresolved: ${conflictFiles.join(", ")}`);
                        }
                    }
                } else {
                    const reason = result.status === "fulfilled" ? result.value.reason : String((result as PromiseRejectedResult).reason);
                    progress?.slice(slice.name, "merge", `skipped: ${reason}`);
                }
            }
        } finally {
            for (const { slice, wt } of waveItems) {
                removeWorktree(wt.path, cwd);
                progress?.slice(slice.name, "worktree", "removed");
            }
        }
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
    progress?: Progress
): Promise<boolean> {
    try {
        const agents = loadAllAgents(preamble, config, cwd);
        const prompt = [
            `You are resolving merge conflicts for slice "${sliceName}".`,
            "",
            "The following files have conflict markers (<<<<<<< / ======= / >>>>>>>):",
            ...conflictFiles.map(f => `- ${f}`),
            "",
            "Resolve each conflict preserving both sides' intent. After resolving, stage every resolved file with `git add`.",
            "Do NOT commit — just stage the resolved files."
        ].join("\n");

        await runAgent("coder", prompt, cwd, agents, progress);

        return true;
    } catch {
        return false;
    }
}

/** Collect paths to all completed implementation notes from prior waves. */
function getCompletedNotes(cwd: string): string[] {
    const notesDir = resolve(cwd, ".adlc/implementation-notes");
    try {
        return readdirSync(notesDir)
            .filter(f => f.endsWith(".md"))
            .map(f => join(notesDir, f));
    } catch {
        return [];
    }
}
