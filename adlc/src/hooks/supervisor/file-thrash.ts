/**
 * File thrash policy — detects agents repeatedly editing/writing the same file
 * without making progress.
 *
 * Monitors Edit/Write calls and triggers when the agent hammers the same file
 * repeatedly. Read/Bash calls do NOT reset the counter because reading the
 * same file you're about to edit is part of the thrash loop.
 *
 * Three tiers:
 * 1. Nudge — block ONE call with specific recovery guidance
 * 2. Escalation — block with stronger guidance, require 2 edits to different files
 * 3. Budget cap — hard limit on total edits to the same hot file
 */

import type { SupervisorEvent, SupervisorState } from "./state.ts";

interface FileThrashResult {
    action: "block";
    severity: "gate" | "recovery";
    tier?: number;
    reason: string;
}

// Consecutive Edit/Write to the same file before triggering.
export const SAME_FILE_THRESHOLD = 5;

// Total edits to the same hot file before hard stop.
export const FILE_TOTAL_BUDGET = 12;

// Edits to DIFFERENT files required before editing the hot file again, per tier.
const DIFFERENT_FILE_GATES: Record<number, number> = {
    1: 1,
    2: 2
};

function basename(filePath: string): string {
    const parts = filePath.replace(/\\/g, "/").split("/");

    return parts[parts.length - 1] || filePath;
}

function gateMessage(remaining: number, filename: string): string {
    return `[runtime-supervisor] File edit gated: ${remaining} more Edit/Write to a DIFFERENT file required before editing \`${filename}\` again.`;
}

function nudgeMessage(hits: number, filename: string): string {
    return [
        `[runtime-supervisor] File loop detected: ${hits} edits to \`${filename}\` without progress.`,
        "",
        "Stop editing this file repeatedly. Read the full error output, identify the",
        "root cause, and determine whether the fix belongs in this file or elsewhere.",
        "",
        `Your next edit to this file will be allowed after ${DIFFERENT_FILE_GATES[1]} Edit/Write to a different file.`
    ].join("\n");
}

function escalationMessage(hits: number, filename: string): string {
    return [
        `[runtime-supervisor] File loop continues after previous warning (${hits} edits to \`${filename}\`).`,
        "",
        "STOP. The file edits are not converging.",
        "Document what you've tried and return to the coordinator.",
        "",
        `Your next edit to this file will be allowed after ${DIFFERENT_FILE_GATES[2]} Edit/Write calls to different files.`
    ].join("\n");
}

function budgetMessage(totalHits: number, filename: string): string {
    return `[runtime-supervisor] File edit budget exhausted (${totalHits}/${FILE_TOTAL_BUDGET} edits to \`${filename}\`). Stop all edits to this file.`;
}

export default function checkFileThrash(event: SupervisorEvent, state: SupervisorState): FileThrashResult | null {
    // Only applies to Edit/Write tools.
    if (event.toolName !== "Edit" && event.toolName !== "Write") {
        return null;
    }

    const hotFile = state.file.currentHotFile;
    if (!hotFile) {
        return null;
    }

    const filename = basename(hotFile);
    const targetPath = event.targetPath ?? "";
    const gatedFile = state.file.gatedFile;

    // 1. Gate enforcement — if in a recovery tier and editing the gated file, require different-file edits first.
    if (state.file.recoveryTier > 0 && gatedFile && targetPath === gatedFile) {
        const requiredDifferent = DIFFERENT_FILE_GATES[state.file.recoveryTier] ?? DIFFERENT_FILE_GATES[2];
        if (state.file.differentFilesSinceRecovery < requiredDifferent) {
            const remaining = requiredDifferent - state.file.differentFilesSinceRecovery;

            return {
                action: "block",
                severity: "gate",
                tier: state.file.recoveryTier,
                reason: gateMessage(remaining, basename(gatedFile))
            };
        }
        // Gate satisfied — fall through to same-file / budget checks.
    }

    // 2. Same-file detection — consecutive Edit/Write to the same file.
    if (state.file.sameFileHits >= SAME_FILE_THRESHOLD) {
        const nextTier = Math.min((state.file.recoveryTier ?? 0) + 1, 2);
        const message = nextTier === 1 ? nudgeMessage(state.file.sameFileHits, filename) : escalationMessage(state.file.sameFileHits, filename);

        return { action: "block", severity: "recovery", tier: nextTier, reason: message };
    }

    // 3. Total budget — hard cap on lifetime edits to the gated file.
    if (state.file.gatedFileLifetimeHits > FILE_TOTAL_BUDGET) {
        return { action: "block", severity: "recovery", tier: 2, reason: budgetMessage(state.file.gatedFileLifetimeHits, filename) };
    }

    return null;
}
