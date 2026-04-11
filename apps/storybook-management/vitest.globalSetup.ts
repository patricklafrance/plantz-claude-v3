/**
 * Vitest globalSetup — kills storybook dev server port on teardown.
 *
 * The @storybook/addon-vitest plugin starts a Vite dev server that doesn't
 * reliably shut down after tests complete, leaving the port occupied.
 * See: https://github.com/storybookjs/storybook/issues/32625
 */

import { execSync } from "node:child_process";

export function teardown() {
    killPort(6006);
}

function killPort(port: number) {
    try {
        if (process.platform === "win32") {
            execSync(
                `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
                { stdio: "ignore" }
            );
        } else {
            execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: "ignore" });
        }
    } catch {
        // Port not in use — ignore.
    }
}
