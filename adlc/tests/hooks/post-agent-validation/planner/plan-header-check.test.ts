import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { planHeaderCheck } from "../../../../src/hooks/post-agent-validation/planner/plan-header-check.js";
import { loadFixture } from "../../../fixtures/load.js";

describe("plan-header-check", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-ph-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should fail when plan-header.md is missing", () => {
        const problems = planHeaderCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("plan-header.md");
    });

    it("should fail when plan-header.md is empty", () => {
        writeFileSync(join(tmp, ".adlc/plan-header.md"), "");
        const problems = planHeaderCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("plan-header.md");
    });

    it("should pass when plan-header.md exists and is non-empty", () => {
        writeFileSync(join(tmp, ".adlc/plan-header.md"), loadFixture("planner", "plan-header.valid.md"));
        expect(planHeaderCheck(tmp)).toHaveLength(0);
    });
});
