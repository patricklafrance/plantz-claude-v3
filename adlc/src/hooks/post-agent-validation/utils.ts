/**
 * Shared utilities for subagent-stop verification hooks.
 * All functions are pure — no module-level state.
 */

import { exec as execCb, execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

// ── .adlc artifact helpers ─────────────────────────────────

/** True when the file exists in .adlc/ and is non-empty. */
export function hasFile(cwd: string, relativePath: string): boolean {
    const abs = resolve(cwd, ".adlc", relativePath);
    try {
        return statSync(abs).size > 0;
    } catch {
        return false;
    }
}

/** Filenames in an .adlc/ subdirectory, optionally filtered by extension. */
export function listFiles(cwd: string, relativeDir: string, ext?: string): string[] {
    const abs = resolve(cwd, ".adlc", relativeDir);
    try {
        const entries = readdirSync(abs);
        return ext ? entries.filter(f => f.endsWith(ext)) : entries;
    } catch {
        return [];
    }
}

// ── Shell execution ───────────────────────────────────────

const RUN_TIMEOUT = 2 * 60_000; // 2 min per command

interface RunResult {
    ok: boolean;
    stdout: string;
    stderr: string;
    code: number | string | undefined;
}

/** Run a command asynchronously. Never rejects — inspect `ok`. */
export function run(cwd: string, cmd: string, opts: Record<string, unknown> = {}): Promise<RunResult> {
    return new Promise(done => {
        execCb(cmd, { cwd, maxBuffer: 10 * 1024 * 1024, timeout: RUN_TIMEOUT, ...opts }, (error, stdout, stderr) => {
            done({
                ok: !error,
                stdout: String(stdout),
                stderr: String(stderr),
                code: error?.code
            });
        });
    });
}

// ── Shell / git helpers ────────────────────────────────────

/** Files changed in the working tree (modified + untracked, including gitignored .adlc/ artifacts) relative to cwd. */
export function getChangedFiles(cwd: string): string[] {
    try {
        const modified = execSync("git diff --name-only HEAD", { cwd, encoding: "utf8" });
        const untracked = execSync("git ls-files --others --exclude-standard", { cwd, encoding: "utf8" });
        const ignoredAdlc = execSync("git ls-files --others --ignored --exclude-standard -- .adlc/", { cwd, encoding: "utf8" });
        const files = `${modified}\n${untracked}\n${ignoredAdlc}`.trim().split("\n").filter(Boolean);
        return [...new Set(files)];
    } catch {
        return [];
    }
}
