import { execSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { attemptMerge, completeMerge, abortMerge, mergeWorktree } from "../../../../../src/workflow/steps/slices/worktree/merger.js";

function git(cmd: string, cwd: string): string {
    return execSync(`git ${cmd}`, { cwd, encoding: "utf-8" });
}

describe("worktree/merger", () => {
    let repoDir: string;

    beforeEach(() => {
        repoDir = mkdtempSync(join(tmpdir(), "merger-test-"));

        git("init", repoDir);
        git("config user.email test@test.com", repoDir);
        git("config user.name Test", repoDir);

        writeFileSync(join(repoDir, "file.txt"), "initial");
        git("add .", repoDir);
        git('commit -m "initial"', repoDir);
    });

    afterEach(() => {
        rmSync(repoDir, { recursive: true, force: true });
    });

    // ── attemptMerge ───────────────────────────────────────────────────

    describe("attemptMerge", () => {
        it("succeeds for a clean merge", () => {
            git("checkout -b adlc/slice-1", repoDir);
            writeFileSync(join(repoDir, "feature.txt"), "feature content");
            git("add .", repoDir);
            git('commit -m "add feature"', repoDir);
            git("checkout main", repoDir);

            const result = attemptMerge("adlc/slice-1", "main", repoDir);

            expect(result.success).toBe(true);
            expect(result.conflictFiles).toBeUndefined();

            const log = git("log --oneline -3", repoDir);
            expect(log).toContain("adlc/slice-1");
        });

        it("returns conflict files and leaves markers in working tree on conflict", () => {
            git("checkout -b adlc/slice-conflict", repoDir);
            writeFileSync(join(repoDir, "file.txt"), "branch content");
            git("add .", repoDir);
            git('commit -m "branch change"', repoDir);

            git("checkout main", repoDir);
            writeFileSync(join(repoDir, "file.txt"), "main content");
            git("add .", repoDir);
            git('commit -m "main change"', repoDir);

            const result = attemptMerge("adlc/slice-conflict", "main", repoDir);

            expect(result.success).toBe(false);
            expect(result.conflictFiles).toContain("file.txt");

            // Conflict markers should still be present (merge NOT aborted)
            const status = git("status --porcelain", repoDir).trim();
            expect(status).toContain("UU file.txt");
        });
    });

    // ── completeMerge ──────────────────────────────────────────────────

    describe("completeMerge", () => {
        it("stages resolved files and commits the merge", () => {
            git("checkout -b adlc/slice-resolve", repoDir);
            writeFileSync(join(repoDir, "file.txt"), "branch content");
            git("add .", repoDir);
            git('commit -m "branch change"', repoDir);

            git("checkout main", repoDir);
            writeFileSync(join(repoDir, "file.txt"), "main content");
            git("add .", repoDir);
            git('commit -m "main change"', repoDir);

            attemptMerge("adlc/slice-resolve", "main", repoDir);

            // Simulate resolving the conflict
            writeFileSync(join(repoDir, "file.txt"), "resolved content");

            completeMerge(repoDir, "merge: resolved slice-resolve");

            const status = git("status --porcelain", repoDir).trim();
            expect(status).toBe("");

            const log = git("log --oneline -1", repoDir);
            expect(log).toContain("merge: resolved slice-resolve");
        });
    });

    // ── abortMerge ─────────────────────────────────────────────────────

    describe("abortMerge", () => {
        it("restores working tree to pre-merge state", () => {
            git("checkout -b adlc/slice-abort", repoDir);
            writeFileSync(join(repoDir, "file.txt"), "branch content");
            git("add .", repoDir);
            git('commit -m "branch change"', repoDir);

            git("checkout main", repoDir);
            writeFileSync(join(repoDir, "file.txt"), "main content");
            git("add .", repoDir);
            git('commit -m "main change"', repoDir);

            attemptMerge("adlc/slice-abort", "main", repoDir);

            abortMerge(repoDir);

            const status = git("status --porcelain", repoDir).trim();
            expect(status).toBe("");
        });
    });

    // ── mergeWorktree (convenience wrapper) ────────────────────────────

    describe("mergeWorktree", () => {
        it("succeeds for a clean merge", () => {
            git("checkout -b adlc/slice-1", repoDir);
            writeFileSync(join(repoDir, "feature.txt"), "feature content");
            git("add .", repoDir);
            git('commit -m "add feature"', repoDir);
            git("checkout main", repoDir);

            const result = mergeWorktree("adlc/slice-1", "main", repoDir);

            expect(result.success).toBe(true);
            expect(result.conflictFiles).toBeUndefined();

            const log = git("log --oneline -3", repoDir);
            expect(log).toContain("adlc/slice-1");
        });

        it("returns conflict files and auto-aborts on conflict", () => {
            git("checkout -b adlc/slice-conflict", repoDir);
            writeFileSync(join(repoDir, "file.txt"), "branch content");
            git("add .", repoDir);
            git('commit -m "branch change"', repoDir);

            git("checkout main", repoDir);
            writeFileSync(join(repoDir, "file.txt"), "main content");
            git("add .", repoDir);
            git('commit -m "main change"', repoDir);

            const result = mergeWorktree("adlc/slice-conflict", "main", repoDir);

            expect(result.success).toBe(false);
            expect(result.conflictFiles).toContain("file.txt");

            // Auto-aborted: repo should be clean
            const status = git("status --porcelain", repoDir).trim();
            expect(status).toBe("");
        });
    });
});
