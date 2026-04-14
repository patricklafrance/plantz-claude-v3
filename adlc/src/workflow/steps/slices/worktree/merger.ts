import { execSync } from "node:child_process";

interface MergeResult {
    success: boolean;
    conflictFiles?: string[];
}

/**
 * Attempt a --no-ff merge. On conflict, leaves conflict markers in the working tree
 * (does NOT abort). Caller must call `completeMerge` or `abortMerge` after resolving.
 */
export function attemptMerge(worktreeBranch: string, targetBranch: string, cwd: string): MergeResult {
    execSync(`git checkout "${targetBranch}"`, { cwd });

    try {
        execSync(`git merge --no-ff "${worktreeBranch}"`, { cwd });

        return { success: true };
    } catch {
        // Use git ls-files -u to catch ALL unmerged entries (both-modified,
        // both-added, deleted-on-one-side, etc.) — more reliable than
        // git diff --diff-filter=U which can miss some conflict types.
        // Output format: "<mode> <hash> <stage>\t<path>"
        const output = execSync("git ls-files -u", {
            cwd,
            encoding: "utf-8"
        });

        const conflictFiles = [
            ...new Set(
                output
                    .split("\n")
                    .map(line => line.split("\t")[1]?.trim())
                    .filter((f): f is string => !!f)
            )
        ];

        return { success: false, conflictFiles };
    }
}

/** Check whether any unmerged entries remain in the index. */
export function hasUnmergedFiles(cwd: string): boolean {
    const output = execSync("git ls-files -u", { cwd, encoding: "utf-8" }).trim();

    return output.length > 0;
}

/** Return true if the source branch has commits that the target branch does not. */
export function hasBranchDiverged(sourceBranch: string, targetBranch: string, cwd: string): boolean {
    const ahead = execSync(`git rev-list --count "${targetBranch}..${sourceBranch}"`, { cwd, encoding: "utf-8" }).trim();

    return ahead !== "0";
}

/**
 * Stage all files and finish a merge that was left with resolved conflict markers.
 * Throws a descriptive error if the commit fails or the working tree is still dirty.
 */
export function completeMerge(cwd: string, message?: string): void {
    execSync("git add -A", { cwd });
    const msg = message ?? "merge: resolve conflicts";

    try {
        execSync(`git commit --no-edit -m "${msg}"`, { cwd });
    } catch (error) {
        // Commit failed — abort the merge to leave the repo in a clean state.
        abortMerge(cwd);
        throw new Error(`Merge commit failed (merge aborted to restore clean state): ${error instanceof Error ? error.message : String(error)}`, {
            cause: error
        });
    }
}

/**
 * Abort a merge in progress, restoring the working tree to the pre-merge state.
 * Safe to call even when no merge is in progress (silently returns).
 */
export function abortMerge(cwd: string): void {
    try {
        execSync("git merge --abort", { cwd });
    } catch {
        // No merge in progress — nothing to abort.
    }
}

/**
 * Convenience wrapper: merge a worktree branch back to the target branch using --no-ff.
 * Auto-aborts on conflict (original behavior).
 */
export function mergeWorktree(worktreeBranch: string, targetBranch: string, cwd: string): MergeResult {
    const result = attemptMerge(worktreeBranch, targetBranch, cwd);

    if (!result.success) {
        abortMerge(cwd);
    }

    return result;
}
