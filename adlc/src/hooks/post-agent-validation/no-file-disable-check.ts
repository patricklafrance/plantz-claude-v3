/**
 * Reject file-level oxlint-disable comments in changed files.
 * Line-level disables (oxlint-disable-next-line, oxlint-disable-line) are allowed.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function noFileDisableCheck(cwd: string, changedFiles: string[]): string[] {
    const hits: string[] = [];
    for (const file of changedFiles) {
        if (!/\.(ts|tsx|js|jsx)$/.test(file)) {
            continue;
        }
        const abs = resolve(cwd, file);
        if (!existsSync(abs)) {
            continue;
        }
        const lines = readFileSync(abs, "utf8").split("\n");
        for (let i = 0; i < lines.length; i++) {
            if (/oxlint-disable(?!-next-line|-line)/.test(lines[i])) {
                hits.push(`  ${file}:${i + 1}: ${lines[i].trim()}`);
            }
        }
    }
    if (hits.length === 0) {
        return [];
    }
    return [`[file-disable] File-level oxlint-disable found:\n${hits.join("\n")}`];
}
