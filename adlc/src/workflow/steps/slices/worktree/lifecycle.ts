import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const WORKTREE_DIR = ".adlc-worktrees";

interface WorktreeInfo {
    path: string;
    branch: string;
    sliceName: string;
}

/** Create a git worktree for a slice. */
export function createWorktree(sliceName: string, baseBranch: string, cwd: string): WorktreeInfo {
    const worktreeBase = resolve(cwd, WORKTREE_DIR);
    const worktreePath = resolve(worktreeBase, sliceName);
    const branch = `adlc/${sliceName}`;

    // Create the worktree directory if needed
    mkdirSync(worktreeBase, { recursive: true });

    // Create worktree with new branch from baseBranch
    execSync(`git worktree add -b "${branch}" "${worktreePath}" "${baseBranch}"`, { cwd });

    return { path: worktreePath, branch, sliceName };
}

/** Remove a git worktree. */
export function removeWorktree(worktreePath: string, cwd: string): void {
    execSync(`git worktree remove "${worktreePath}" --force`, { cwd });
}
