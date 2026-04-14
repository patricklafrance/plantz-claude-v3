import { exec, execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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

/**
 * Remove a git worktree asynchronously.
 *
 * Uses `pnpm dlx rimraf` to nuke node_modules first (cross-platform,
 * handles Windows MAX_PATH), then `git worktree remove --force`.
 * Returns a promise the caller can ignore (fire-and-forget) so cleanup
 * doesn't block the main pipeline.
 */
export async function removeWorktreeAsync(worktreePath: string, cwd: string): Promise<void> {
    const nodeModules = resolve(worktreePath, "node_modules");
    await execAsync(`pnpm dlx rimraf "${nodeModules}"`, { cwd }).catch(() => {});
    await execAsync(`git worktree remove "${worktreePath}" --force`, { cwd });
}
