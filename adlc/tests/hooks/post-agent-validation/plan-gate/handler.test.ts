import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handlePlanGate } from "../../../../src/hooks/post-agent-validation/plan-gate/handler.js";
import { loadFixture } from "../../../fixtures/load.js";

describe("plan-gate handler (composition)", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-arch-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
        execSync("git init && git config user.email test@test.com && git config user.name test && git add -A && git commit --allow-empty -m init", {
            cwd: tmp,
            stdio: "ignore"
        });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should pass when no revision file exists (architect approved)", () => {
        expect(handlePlanGate(tmp)).toHaveLength(0);
    });

    it("should pass when revision references a slice", () => {
        writeFileSync(join(tmp, ".adlc/plan-gate-revision.md"), loadFixture("plan-gate", "revision.valid.md"));
        expect(handlePlanGate(tmp)).toHaveLength(0);
    });

    it("should fail when revision lacks slice references", () => {
        writeFileSync(join(tmp, ".adlc/plan-gate-revision.md"), loadFixture("plan-gate", "revision-no-refs.invalid.md"));
        const problems = handlePlanGate(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("slice references");
    });

    it("should collect problems from both checks", () => {
        // Invalid revision (no slice refs) AND modified plan file -> 2 problems
        writeFileSync(join(tmp, ".adlc/plan-gate-revision.md"), loadFixture("plan-gate", "revision-no-refs.invalid.md"));
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan\n");
        execSync('git add -A && git commit -m "add plan"', { cwd: tmp, stdio: "ignore" });
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan: Modified\n");
        const problems = handlePlanGate(tmp);
        expect(problems).toHaveLength(2);
        expect(problems.some(p => p.includes("plan files"))).toBe(true);
        expect(problems.some(p => p.includes("slice references"))).toBe(true);
    });
});
