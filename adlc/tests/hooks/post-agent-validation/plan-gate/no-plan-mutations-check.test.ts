import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { noPlanMutationsCheck } from "../../../../src/hooks/post-agent-validation/plan-gate/no-plan-mutations-check.js";

function gitInit(cwd: string): void {
    execSync("git init && git config user.email test@test.com && git config user.name test && git add -A && git commit --allow-empty -m init", {
        cwd,
        stdio: "ignore"
    });
}

describe("no-plan-mutations-check", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-arch-npm-"));
        mkdirSync(join(tmp, ".adlc/slices"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should pass when no plan files are modified", () => {
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan\n");
        writeFileSync(join(tmp, ".adlc/slices/01-first.md"), "# Slice 1\n");
        gitInit(tmp);
        // No modifications after commit
        expect(noPlanMutationsCheck(tmp)).toHaveLength(0);
    });

    it("should fail when plan-header.md is modified", () => {
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan\n");
        gitInit(tmp);
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan: Modified\n");
        const problems = noPlanMutationsCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("must never modify plan files");
        expect(problems[0]).toContain("plan-header.md");
    });

    it("should fail when a slice file is modified", () => {
        writeFileSync(join(tmp, ".adlc/slices/01-first.md"), "# Slice 1\n");
        gitInit(tmp);
        writeFileSync(join(tmp, ".adlc/slices/01-first.md"), "# Slice 1: Modified\n");
        const problems = noPlanMutationsCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("01-first.md");
    });

    it("should list all modified plan files in error", () => {
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan\n");
        writeFileSync(join(tmp, ".adlc/slices/01-first.md"), "# Slice 1\n");
        gitInit(tmp);
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan: Modified\n");
        writeFileSync(join(tmp, ".adlc/slices/01-first.md"), "# Slice 1: Modified\n");
        const problems = noPlanMutationsCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("plan-header.md");
        expect(problems[0]).toContain("01-first.md");
    });

    it("should pass when non-plan .adlc files are modified", () => {
        writeFileSync(join(tmp, ".adlc/plan-gate-revision.md"), "# Revision\n");
        gitInit(tmp);
        writeFileSync(join(tmp, ".adlc/plan-gate-revision.md"), "# Revision: Updated\n");
        expect(noPlanMutationsCheck(tmp)).toHaveLength(0);
    });
});
