import { execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createWorktree, removeWorktreeAsync } from "../../../../../src/workflow/steps/slices/worktree/lifecycle.js";

describe("worktree/lifecycle", () => {
    let repoDir: string;
    let runDir: string;

    beforeEach(() => {
        repoDir = mkdtempSync(join(tmpdir(), "lifecycle-test-"));
        runDir = join(repoDir, ".adlc", "test-run");
        mkdirSync(runDir, { recursive: true });

        // Initialise a bare git repo with one commit so branches work
        execSync("git init", { cwd: repoDir });
        execSync("git config user.email test@test.com", { cwd: repoDir });
        execSync("git config user.name Test", { cwd: repoDir });
        execSync("git commit --allow-empty -m init", { cwd: repoDir });
        // Ensure the default branch is named "main" regardless of git config
        execSync("git branch -M main", { cwd: repoDir });
    });

    afterEach(() => {
        try {
            execSync("git worktree prune", { cwd: repoDir });
        } catch {
            // ignore
        }
        rmSync(repoDir, { recursive: true, force: true });
    });

    it("createWorktree creates a valid git worktree", () => {
        const info = createWorktree("slice-a", "main", repoDir, runDir);

        expect(info.sliceName).toBe("slice-a");
        expect(info.branch).toBe("adlc/slice-a");
        expect(existsSync(info.path)).toBe(true);
        expect(existsSync(join(info.path, ".git"))).toBe(true);
        expect(info.path).toContain(join(".adlc", "test-run", "worktrees", "slice-a"));

        const list = execSync("git worktree list", {
            cwd: repoDir,
            encoding: "utf-8"
        });
        expect(list).toContain("slice-a");
    });

    it("removeWorktreeAsync removes the worktree cleanly", async () => {
        const info = createWorktree("slice-b", "main", repoDir, runDir);
        expect(existsSync(info.path)).toBe(true);

        await removeWorktreeAsync(info.path, repoDir);

        expect(existsSync(info.path)).toBe(false);

        const list = execSync("git worktree list", {
            cwd: repoDir,
            encoding: "utf-8"
        });
        expect(list).not.toContain("slice-b");
    });
});
