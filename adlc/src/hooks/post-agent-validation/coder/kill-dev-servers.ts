/** Kill dev server processes (storybook, rsbuild) scoped to a working directory. */

import { execSync } from "node:child_process";

/**
 * Kill dev server processes whose command line matches known dev server patterns
 * and whose working directory is within the given `cwd`.
 *
 * Unlike port-based cleanup, this works with dynamic ports — the servers
 * pick available ports at startup, so we match by process command pattern instead.
 */
export function killDevServers(cwd: string): void {
    try {
        if (process.platform === "win32") {
            // PowerShell: find node processes whose command line contains
            // storybook or rsbuild dev patterns AND whose path overlaps cwd.
            const escapedCwd = cwd.replace(/\\/g, "\\\\");
            execSync(
                `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name='node.exe'\\" | Where-Object { $_.CommandLine -match '(storybook\\s+dev|rsbuild\\s+dev)' -and $_.CommandLine -match '${escapedCwd}'.Replace('\\\\','/') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"`,
                { stdio: "ignore", timeout: 5000 }
            );
        } else {
            // Unix: use pgrep + pkill to match node processes running dev servers
            // whose command line contains the worktree path.
            const escapedCwd = cwd.replace(/'/g, "'\\''");
            execSync(
                `pgrep -f '(storybook\\s+dev|rsbuild\\s+dev)' | xargs -I{} sh -c 'grep -q "${escapedCwd}" /proc/{}/cmdline 2>/dev/null && kill -9 {} 2>/dev/null' || true`,
                { stdio: "ignore", timeout: 5000 }
            );
        }
    } catch {
        // Process not found or command timed out — ignore.
    }
}
