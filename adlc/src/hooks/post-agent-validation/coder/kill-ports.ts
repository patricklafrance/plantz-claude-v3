/** Kill processes on configured dev server ports. */

import { execSync } from "node:child_process";

export function killPorts(ports: number[]): void {
    for (const port of ports) {
        try {
            if (process.platform === "win32") {
                execSync(
                    `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
                    { stdio: "ignore", timeout: 3000 }
                );
            } else {
                execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: "ignore", timeout: 3000 });
            }
        } catch {
            // Port not in use or command timed out -- ignore.
        }
    }
}
