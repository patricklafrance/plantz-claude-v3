#!/usr/bin/env node

/**
 * PostCompact hook — restores saved context after compaction.
 *
 * Reads the backup written by the /_safe-compact skill, outputs formatted
 * context for injection into the post-compact conversation, then deletes
 * the backup file so it doesn't leak into future compactions.
 *
 * Exit 0 always — restoration is best-effort, never block.
 */

import { readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const cwd = input.cwd || process.cwd();
const backupPath = resolve(cwd, "tmp", "pre-compact.md");

try {
    const content = readFileSync(backupPath, "utf8");

    unlinkSync(backupPath);

    if (content.trim()) {
        process.stdout.write([
            "# Restored Session Context (auto-injected by post-compact hook)",
            "",
            "The following context was saved by the /safe-compact skill before compaction.",
            "Use it to resume work without losing track of decisions, progress, and next steps.",
            "",
            "---",
            "",
            content
        ].join("\n"));
    }
} catch {
    // No backup file — nothing to restore. Fine for auto-compact.
}
