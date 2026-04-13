import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedAdlc, type SliceContext } from "../../../../../src/workflow/steps/slices/worktree/seeder.js";

describe("worktree/seeder", () => {
    let worktreePath: string;
    let sourceDir: string;
    let context: SliceContext;

    beforeEach(() => {
        worktreePath = mkdtempSync(join(tmpdir(), "seeder-wt-"));
        sourceDir = mkdtempSync(join(tmpdir(), "seeder-src-"));

        writeFileSync(join(sourceDir, "plan-header.md"), "# Plan Header");
        writeFileSync(join(sourceDir, "domain-mapping.md"), "# Domain Mapping");

        const slicesDir = join(sourceDir, "slices");
        mkdirSync(slicesDir);
        writeFileSync(join(slicesDir, "slice-01.md"), "# Slice 1");
        writeFileSync(join(slicesDir, "slice-02.md"), "# Slice 2");

        const notesDir = join(sourceDir, "notes");
        mkdirSync(notesDir);
        writeFileSync(join(notesDir, "note-a.md"), "Note A content");

        context = {
            runDirName: "test-run",
            planHeaderPath: join(sourceDir, "plan-header.md"),
            domainMappingPath: join(sourceDir, "domain-mapping.md"),
            slicesDir,
            sliceFilename: "slice-01.md",
            priorImplementationNotes: [join(notesDir, "note-a.md")]
        };
    });

    afterEach(() => {
        rmSync(worktreePath, { recursive: true, force: true });
        rmSync(sourceDir, { recursive: true, force: true });
    });

    it("creates the expected directory structure", async () => {
        await seedAdlc(worktreePath, context);

        const runDir = join(worktreePath, ".adlc", "test-run");
        expect(existsSync(runDir)).toBe(true);
        expect(existsSync(join(runDir, "slices"))).toBe(true);
        expect(existsSync(join(runDir, "implementation-notes"))).toBe(true);
    });

    it("copies plan-header.md and domain-mapping.md", async () => {
        await seedAdlc(worktreePath, context);

        const runDir = join(worktreePath, ".adlc", "test-run");
        expect(readFileSync(join(runDir, "plan-header.md"), "utf-8")).toBe("# Plan Header");
        expect(readFileSync(join(runDir, "domain-mapping.md"), "utf-8")).toBe("# Domain Mapping");
    });

    it("copies all slice files into .adlc/<runDirName>/slices/", async () => {
        await seedAdlc(worktreePath, context);

        const slicesDir = join(worktreePath, ".adlc", "test-run", "slices");
        expect(readFileSync(join(slicesDir, "slice-01.md"), "utf-8")).toBe("# Slice 1");
        expect(readFileSync(join(slicesDir, "slice-02.md"), "utf-8")).toBe("# Slice 2");
    });

    it("copies the current slice as current-slice.md", async () => {
        await seedAdlc(worktreePath, context);

        expect(readFileSync(join(worktreePath, ".adlc", "test-run", "current-slice.md"), "utf-8")).toBe("# Slice 1");
    });

    it("copies prior implementation notes", async () => {
        await seedAdlc(worktreePath, context);

        expect(readFileSync(join(worktreePath, ".adlc", "test-run", "implementation-notes", "note-a.md"), "utf-8")).toBe("Note A content");
    });
});
