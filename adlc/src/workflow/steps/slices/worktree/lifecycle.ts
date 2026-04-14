import { exec, execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Kill every process whose executable lives under the given directory.
 *
 * On Windows, running `.exe` files are locked by the OS, which prevents
 * rimraf / `rm` from deleting them. This is the typical blocker when
 * tearing down worktrees that ran `agent-browser` or similar native
 * binaries via `node_modules/.bin`.
 */
async function killProcessesUnder(dir: string): Promise<void> {
    if (process.platform !== "win32") {
        return;
    }

    const normalizedDir = dir.replace(/\//g, "\\");

    try {
        const { stdout } = await execAsync(
            `powershell -NoProfile -Command "Get-Process | Where-Object { $_.Path -and $_.Path.StartsWith('${normalizedDir}', [System.StringComparison]::OrdinalIgnoreCase) } | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue; $_.Id }"`,
            { timeout: 10_000 }
        );

        if (stdout.trim()) {
            // Brief pause so Windows releases file handles after process exit.
            await new Promise(r => setTimeout(r, 500));
        }
    } catch {
        // Ignore — best-effort cleanup.
    }
}

interface WorktreeInfo {
    path: string;
    branch: string;
    sliceName: string;
}

/** Check whether a local git branch already exists. */
function branchExists(name: string, cwd: string): boolean {
    try {
        execSync(`git rev-parse --verify "refs/heads/${name}"`, { cwd, stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
}

/** Pick a branch name, appending a numeric suffix if the base name is taken. */
function pickBranch(baseName: string, cwd: string): string {
    if (!branchExists(baseName, cwd)) {
        return baseName;
    }
    for (let i = 2; i <= 99; i++) {
        const candidate = `${baseName}-${i}`;
        if (!branchExists(candidate, cwd)) {
            return candidate;
        }
    }
    throw new Error(`Could not create branch "${baseName}" — all suffixes up to -99 are taken.`);
}

/** Create a git worktree for a slice under `.adlc/{runDir}/worktrees/`. */
export function createWorktree(sliceName: string, baseBranch: string, cwd: string, runDir: string): WorktreeInfo {
    const worktreeBase = resolve(runDir, "worktrees");
    const worktreePath = resolve(worktreeBase, sliceName);
    const branch = pickBranch(`adlc/${sliceName}`, cwd);

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
    // Kill any processes whose executable lives inside the worktree (e.g.
    // agent-browser .exe) before deleting, otherwise Windows will EPERM.
    await killProcessesUnder(worktreePath);

    const nodeModules = resolve(worktreePath, "node_modules");
    await execAsync(`pnpm dlx rimraf "${nodeModules}"`, { cwd }).catch(() => {});
    await execAsync(`git worktree remove "${worktreePath}" --force`, { cwd });
}
