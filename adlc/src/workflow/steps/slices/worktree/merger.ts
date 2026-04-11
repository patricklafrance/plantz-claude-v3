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
        const output = execSync("git diff --name-only --diff-filter=U", {
            cwd,
            encoding: "utf-8"
        });

        const conflictFiles = output
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean);

        return { success: false, conflictFiles };
    }
}

/** Stage all files and finish a merge that was left with resolved conflict markers. */
export function completeMerge(cwd: string, message?: string): void {
    execSync("git add -A", { cwd });
    const msg = message ?? "merge: resolve conflicts";
    execSync(`git commit --no-edit -m "${msg}"`, { cwd });
}

/** Abort a merge in progress, restoring the working tree to the pre-merge state. */
export function abortMerge(cwd: string): void {
    execSync("git merge --abort", { cwd });
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
