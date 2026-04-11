/** Scan changed files for secrets via gitleaks. Soft-fail if gitleaks is not installed. */

import { existsSync, mkdtempSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";

import { run } from "../utils.ts";

export async function noSecretsCheck(cwd: string, changedFiles: string[]): Promise<string[]> {
    const available = await run(cwd, "gitleaks version");
    if (!available.ok) {
        return [];
    }

    if (changedFiles.length === 0) {
        return [];
    }

    // Copy changed files to a temp directory so gitleaks scans only them.
    const tmpDir = mkdtempSync(join(tmpdir(), "adlc-secrets-"));
    try {
        for (const file of changedFiles) {
            const src = resolve(cwd, file);
            if (!existsSync(src)) {
                continue;
            }
            const dest = resolve(tmpDir, file);
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(src, dest);
        }
        const configPath = resolve(cwd, ".gitleaks.toml");
        const configFlag = existsSync(configPath) ? ` --config "${configPath}"` : "";
        const scan = await run(cwd, `gitleaks detect --no-git -s "${tmpDir}"${configFlag}`);
        if (!scan.ok) {
            return [`[secrets] Potential secrets detected:\n${scan.stdout}${scan.stderr}`];
        }
        return [];
    } finally {
        rmSync(tmpDir, { recursive: true, force: true });
    }
}
