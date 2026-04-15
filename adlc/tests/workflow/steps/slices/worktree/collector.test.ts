import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { collectResults } from "../../../../../src/workflow/steps/slices/worktree/collector.js";

describe("worktree/collector", () => {
    let worktreePath: string;
    let mainAdlcPath: string;

    beforeEach(() => {
        worktreePath = mkdtempSync(join(tmpdir(), "collector-wt-"));
        mainAdlcPath = mkdtempSync(join(tmpdir(), "collector-main-"));

        const runDir = join(worktreePath, ".adlc", "test-run");
        mkdirSync(join(runDir, "implementation-notes"), { recursive: true });

        writeFileSync(join(runDir, "implementation-notes", "slice-1.md"), "Impl notes for slice 1");
        writeFileSync(join(runDir, "verification-results.md"), "## Passed\n- [x] Criterion A");
    });

    afterEach(() => {
        rmSync(worktreePath, { recursive: true, force: true });
        rmSync(mainAdlcPath, { recursive: true, force: true });
    });

    it("copies implementation-notes to the main .adlc/", async () => {
        await collectResults(worktreePath, mainAdlcPath, "slice-1", "test-run");

        const dest = join(mainAdlcPath, "implementation-notes", "slice-1.md");
        expect(existsSync(dest)).toBe(true);
        expect(readFileSync(dest, "utf-8")).toBe("Impl notes for slice 1");
    });

    it("copies verification-results.md as verification-results/{sliceName}.md", async () => {
        await collectResults(worktreePath, mainAdlcPath, "01-plant-list", "test-run");

        const dest = join(mainAdlcPath, "verification-results", "01-plant-list.md");
        expect(existsSync(dest)).toBe(true);
        expect(readFileSync(dest, "utf-8")).toBe("## Passed\n- [x] Criterion A");
    });

    it("falls back to worktree root for verification-results.md", async () => {
        // Remove from ADLC run dir, place at worktree root instead
        const runDir = join(worktreePath, ".adlc", "test-run");
        rmSync(join(runDir, "verification-results.md"));
        writeFileSync(join(worktreePath, "verification-results.md"), "## Passed\n- [x] Fallback");

        await collectResults(worktreePath, mainAdlcPath, "slice-fallback", "test-run");

        const dest = join(mainAdlcPath, "verification-results", "slice-fallback.md");
        expect(existsSync(dest)).toBe(true);
        expect(readFileSync(dest, "utf-8")).toBe("## Passed\n- [x] Fallback");
    });

    it("collects explorer summary as explorer-notes/{sliceName}.md", async () => {
        const runDir = join(worktreePath, ".adlc", "test-run");
        writeFileSync(join(runDir, "current-explorer-summary.md"), "## @packages/api\nExplorer findings");

        await collectResults(worktreePath, mainAdlcPath, "slice-1", "test-run");

        const dest = join(mainAdlcPath, "explorer-notes", "slice-1.md");
        expect(existsSync(dest)).toBe(true);
        expect(readFileSync(dest, "utf-8")).toBe("## @packages/api\nExplorer findings");
    });

    it("falls back to worktree root for current-explorer-summary.md", async () => {
        writeFileSync(join(worktreePath, "current-explorer-summary.md"), "## Fallback explorer");

        await collectResults(worktreePath, mainAdlcPath, "slice-1", "test-run");

        const dest = join(mainAdlcPath, "explorer-notes", "slice-1.md");
        expect(existsSync(dest)).toBe(true);
        expect(readFileSync(dest, "utf-8")).toBe("## Fallback explorer");
    });

    it("handles missing source directories gracefully", async () => {
        const emptyWt = mkdtempSync(join(tmpdir(), "collector-empty-"));

        await collectResults(emptyWt, mainAdlcPath, "slice-x", "test-run");

        expect(existsSync(join(mainAdlcPath, "implementation-notes"))).toBe(false);
        expect(existsSync(join(mainAdlcPath, "verification-results"))).toBe(false);
        expect(existsSync(join(mainAdlcPath, "explorer-notes"))).toBe(false);

        rmSync(emptyWt, { recursive: true, force: true });
    });

    // ── Reconciliation of misplaced flat file ──────────────────────────

    it("skips reconciliation when worktree already provides verification-results.md", async () => {
        // Worktree has its own results — the flat file belongs to a different parallel slice
        writeFileSync(join(mainAdlcPath, "verification-results.md"), "## Passed\n- [x] From another slice");

        await collectResults(worktreePath, mainAdlcPath, "slice-1", "test-run");

        const dest = join(mainAdlcPath, "verification-results", "slice-1.md");
        // Should use the worktree file, NOT the flat file from another slice
        expect(readFileSync(dest, "utf-8")).toBe("## Passed\n- [x] Criterion A");
        // Flat file should be untouched (it belongs to another slice)
        expect(existsSync(join(mainAdlcPath, "verification-results.md"))).toBe(true);
    });

    it("uses flat file reconciliation when worktree has no verification-results.md", async () => {
        // Remove worktree verification file — flat file is the only source
        const runDir = join(worktreePath, ".adlc", "test-run");
        rmSync(join(runDir, "verification-results.md"));
        writeFileSync(join(mainAdlcPath, "verification-results.md"), "## Passed\n- [x] From revision reviewer");

        await collectResults(worktreePath, mainAdlcPath, "slice-1", "test-run");

        const dest = join(mainAdlcPath, "verification-results", "slice-1.md");
        expect(readFileSync(dest, "utf-8")).toBe("## Passed\n- [x] From revision reviewer");
        // Flat file should be cleaned up after reconciliation
        expect(existsSync(join(mainAdlcPath, "verification-results.md"))).toBe(false);
    });

    it("does not fail when no flat verification-results.md exists in the main run dir", async () => {
        // Default setup has no flat file in mainAdlcPath — should not throw
        await collectResults(worktreePath, mainAdlcPath, "slice-1", "test-run");

        const dest = join(mainAdlcPath, "verification-results", "slice-1.md");
        expect(existsSync(dest)).toBe(true);
        expect(readFileSync(dest, "utf-8")).toBe("## Passed\n- [x] Criterion A");
    });
});
