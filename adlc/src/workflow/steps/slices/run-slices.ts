/** Step 3: DAG-aware wave execution with parallel slices. */

import { exec, execSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import type { ResolvedConfig } from "../../../config.js";
import { allocatePorts } from "../../../ports.js";
import type { Progress } from "../../../progress.js";
import { runAgent, loadAllAgents } from "../../agents.js";
import type { OrchestratorOptions } from "../../orchestrator.js";
import { buildDAG } from "./dag/scheduler.js";
import { runSlicePipeline } from "./revision-loop.js";
import { collectResults } from "./worktree/collector.js";
import { createWorktree, removeWorktree } from "./worktree/lifecycle.js";
import { attemptMerge, completeMerge, abortMerge } from "./worktree/merger.js";
import { seedAdlc } from "./worktree/seeder.js";

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

    for (const wave of dag.waves) {
        progress?.wave(wave.index, wave.slices.length, wave.slices.length);

        // Create worktrees
        const worktrees = wave.slices.map(slice => createWorktree(slice.name, featureBranch, cwd));

        try {
            // Seed .adlc/ in each worktree
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(
                worktrees.map((wt, i) =>
                    seedAdlc(wt.path, {
                        planHeaderPath: resolve(cwd, ".adlc/plan-header.md"),
                        domainMappingPath: resolve(cwd, ".adlc/domain-mapping.md"),
                        slicesDir: resolve(cwd, ".adlc/slices"),
                        sliceFilename: wave.slices[i].filename,
                        priorImplementationNotes: getCompletedNotes(cwd)
                    })
                )
            );

            // Install deps in each worktree
            // eslint-disable-next-line no-await-in-loop
            await Promise.all(worktrees.map(wt => execAsync("pnpm install", { cwd: wt.path })));

            // Run slices in parallel
            const ports = worktrees.map((_, i) => allocatePorts(i, config.ports));
            // eslint-disable-next-line no-await-in-loop
            const results = await Promise.allSettled(
                worktrees.map((wt, i) => {
                    progress?.slice(wave.slices[i].name, "pipeline", "starting");
                    return runSlicePipeline(wave.slices[i].name, wt.path, ports[i], preamble, config, cwd, progress);
                })
            );

            // Merge sequentially — resolve conflicts with coder agent
            for (let i = 0; i < worktrees.length; i++) {
                const result = results[i];
                if (result.status === "fulfilled" && result.value.success) {
                    progress?.slice(wave.slices[i].name, "merge", "merging to feature branch");
                    const mergeResult = attemptMerge(worktrees[i].branch, featureBranch, cwd);

                    if (mergeResult.success) {
                        // eslint-disable-next-line no-await-in-loop
                        await collectResults(worktrees[i].path, resolve(cwd, ".adlc"), wave.slices[i].name);
                    } else {
                        // Conflict — attempt agent-assisted resolution
                        const conflictFiles = mergeResult.conflictFiles ?? [];
                        progress?.slice(wave.slices[i].name, "merge", `conflict in ${conflictFiles.join(", ")} — resolving`);

                        // eslint-disable-next-line no-await-in-loop
                        const resolved = await resolveConflicts(wave.slices[i].name, conflictFiles, preamble, config, cwd);
                        if (resolved) {
                            completeMerge(cwd, `merge: resolve conflicts for ${wave.slices[i].name}`);
                            // eslint-disable-next-line no-await-in-loop
                            await collectResults(worktrees[i].path, resolve(cwd, ".adlc"), wave.slices[i].name);
                            progress?.slice(wave.slices[i].name, "merge", "conflicts resolved");
                        } else {
                            abortMerge(cwd);
                            progress?.slice(wave.slices[i].name, "merge", `conflict unresolved: ${conflictFiles.join(", ")}`);
                        }
                    }
                } else {
                    const reason = result.status === "fulfilled" ? result.value.reason : String((result as PromiseRejectedResult).reason);
                    progress?.slice(wave.slices[i].name, "merge", `skipped: ${reason}`);
                }
            }
        } finally {
            for (const wt of worktrees) {
                removeWorktree(wt.path, cwd);
            }
        }
    }
}

/**
 * Spawn the coder agent to resolve merge conflict markers in the working tree.
 * Returns true if the agent succeeds (files staged, ready for commit).
 */
async function resolveConflicts(sliceName: string, conflictFiles: string[], preamble: string, config: ResolvedConfig, cwd: string): Promise<boolean> {
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

        await runAgent("coder", prompt, cwd, agents);

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
