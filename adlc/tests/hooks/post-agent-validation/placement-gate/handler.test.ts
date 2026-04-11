import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handlePlacementGate } from "../../../../src/hooks/post-agent-validation/placement-gate/handler.js";

describe("placement-gate handler", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-pg-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
        execSync("git init && git config user.email test@test.com && git config user.name test && git add -A && git commit --allow-empty -m init", {
            cwd: tmp,
            stdio: "ignore"
        });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should pass when no revision file exists and no plan files modified", () => {
        expect(handlePlacementGate(tmp)).toHaveLength(0);
    });

    it("should pass when revision file has ISSUE blocks", () => {
        writeFileSync(join(tmp, ".adlc/placement-gate-revision.md"), "# Revision\n\n### ISSUE-1\n\nSome issue.\n");
        expect(handlePlacementGate(tmp)).toHaveLength(0);
    });

    it("should fail when revision file exists but has no ISSUE blocks", () => {
        writeFileSync(join(tmp, ".adlc/placement-gate-revision.md"), "# Revision\n\nSome vague feedback.\n");
        const problems = handlePlacementGate(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("ISSUE-N");
    });

    it("should fail when plan files are modified", () => {
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan\n");
        execSync('git add -A && git commit -m "add plan"', { cwd: tmp, stdio: "ignore" });
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan: Modified\n");
        const problems = handlePlacementGate(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("plan files");
    });

    it("should collect problems from both checks", () => {
        // Modified plan file AND revision without ISSUE blocks
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan\n");
        execSync('git add -A && git commit -m "add plan"', { cwd: tmp, stdio: "ignore" });
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "# Plan: Modified\n");
        writeFileSync(join(tmp, ".adlc/placement-gate-revision.md"), "# Revision\n\nVague.\n");
        const problems = handlePlacementGate(tmp);
        expect(problems).toHaveLength(2);
        expect(problems.some(p => p.includes("plan files"))).toBe(true);
        expect(problems.some(p => p.includes("ISSUE-N"))).toBe(true);
    });
});
