/**
 * Repository preflight validation — runs at the start of every run()
 * to catch misconfiguration early with clear error messages.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const REQUIRED_SCRIPTS = [
    "build",
    "lint",
    "test",
    "typecheck",
    "lint-check",
    "lint-fix",
    "format-check",
    "format-fix",
    "knip",
    "syncpack",
    "dev-app",
    "dev-storybook"
] as const;

const REQUIRED_BINARIES = ["agent-browser"] as const;

export type ExecBinary = (name: string, cwd: string) => void;

export type ExecCommand = (command: string, cwd: string) => string;

function defaultExecCommand(command: string, cwd: string): string {
    return execSync(command, {
        cwd,
        stdio: "pipe",
        timeout: 120_000
    }).toString();
}

function defaultExecBinary(name: string, cwd: string): void {
    // Use execSync with a string command — execFileSync cannot resolve .cmd/.ps1
    // shims on Windows, causing ENOENT even when pnpm is on PATH.
    execSync(`pnpm exec ${name} --version`, {
        cwd,
        stdio: "pipe",
        timeout: 10_000
    });
}

/**
 * Validate that the consumer's repo has the required scripts, binaries,
 * and reference directory.
 * Throws on the first missing item with a clear error message.
 *
 * @param referenceDir - Absolute path to the reference docs directory.
 * @param execBinary - Optional function to check binary executability (for testing).
 */
export function validateRepository(cwd: string, referenceDir: string, execBinary: ExecBinary = defaultExecBinary): void {
    const pkgPath = join(cwd, "package.json");
    let pkg: { scripts?: Record<string, string>; devDependencies?: Record<string, string> };

    try {
        pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    } catch {
        throw new Error(`Cannot read ${pkgPath}. Ensure a package.json exists in the target repository root.`);
    }

    const scripts = pkg.scripts ?? {};

    for (const name of REQUIRED_SCRIPTS) {
        if (!scripts[name]) {
            throw new Error(`Missing script \`${name}\` in root package.json. The ADLC harness expects: ${REQUIRED_SCRIPTS.join(", ")}`);
        }
    }

    const devDeps = pkg.devDependencies ?? {};

    for (const name of REQUIRED_BINARIES) {
        if (!devDeps[name]) {
            throw new Error(`Missing binary \`${name}\` — install it as a devDependency in root package.json`);
        }

        try {
            execBinary(name, cwd);
        } catch {
            throw new Error(
                `Binary \`${name}\` is declared in devDependencies but not executable. Run \`pnpm install\` in the repository root.`
            );
        }
    }

    if (!existsSync(referenceDir)) {
        throw new Error(
            `Reference docs directory not found at \`${referenceDir}\`. Create it or set \`structure.reference\` in adlc.config.ts to point to your docs directory.`
        );
    }

    // Verify no Storybook dev scripts contain hardcoded port flags.
    // The ADLC pipeline requires dynamic port assignment — hardcoded ports
    // cause conflicts when parallel worktrees run dev servers simultaneously.
    const appsDir = join(cwd, "apps");
    if (existsSync(appsDir)) {
        const storybookDirs = readdirSync(appsDir).filter(d => d.startsWith("storybook"));
        for (const dir of storybookDirs) {
            const sbPkgPath = join(appsDir, dir, "package.json");
            if (!existsSync(sbPkgPath)) {
                continue;
            }
            try {
                const sbPkg = JSON.parse(readFileSync(sbPkgPath, "utf-8")) as { scripts?: Record<string, string> };
                const devScript = sbPkg.scripts?.dev ?? "";
                if (/-p\s+\d+/.test(devScript)) {
                    throw new Error(
                        `Dev script in apps/${dir}/package.json contains a hardcoded port flag (${devScript.match(/-p\s+\d+/)![0]}). Remove the -p flag — the ADLC pipeline requires dynamic port assignment.`
                    );
                }
            } catch (e) {
                if (e instanceof Error && e.message.includes("hardcoded port flag")) {
                    throw e;
                }
                // Malformed JSON — ignore, not our concern here.
            }
        }
    }
}

const CLEAN_STATE_COMMANDS = ["pnpm lint", "pnpm test"] as const;

/**
 * Run `pnpm lint` and `pnpm test` to ensure the codebase has no
 * pre-existing errors before starting an ADLC run.
 * Throws on the first command that fails, with a clear error message
 * including the first 2000 characters of output.
 *
 * @param cwd - Repository root directory.
 * @param execCommand - Optional injectable command executor (for testing).
 */
export function validateCleanState(cwd: string, execCommand: ExecCommand = defaultExecCommand): void {
    for (const command of CLEAN_STATE_COMMANDS) {
        try {
            execCommand(command, cwd);
        } catch (err: unknown) {
            let output = "";

            if (err && typeof err === "object") {
                const e = err as { stdout?: Buffer | string; stderr?: Buffer | string; message?: string };
                const stdout = e.stdout ? e.stdout.toString() : "";
                const stderr = e.stderr ? e.stderr.toString() : "";
                output = (stdout + stderr) || e.message || "";
            }

            const truncated = output.slice(0, 2000);

            throw new Error(
                `Preflight check failed: \`${command}\` exited with errors.\n` +
                "The ADLC pipeline requires a clean codebase before starting.\n" +
                "Fix the issues above, then re-run.\n\n" +
                `Output:\n${truncated}`
            );
        }
    }
}
