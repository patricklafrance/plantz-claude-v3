import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { sliceCriteriaCheck } from "../../../../src/hooks/post-agent-validation/planner/slice-criteria-check.js";
import { loadFixture } from "../../../fixtures/load.js";

describe("slice-criteria-check", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-sc-"));
        mkdirSync(join(tmp, ".adlc/slices"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should pass when slice has criteria checkboxes", () => {
        writeFileSync(join(tmp, ".adlc/slices/01-plant-list.md"), loadFixture("planner", "slice-01-plant-list.valid.md"));
        expect(sliceCriteriaCheck(tmp)).toHaveLength(0);
    });

    it("should fail when slice has no criteria", () => {
        writeFileSync(join(tmp, ".adlc/slices/01-empty.md"), loadFixture("planner", "slice-no-criteria.invalid.md"));
        const problems = sliceCriteriaCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("no acceptance criteria");
        expect(problems[0]).toContain("01-empty.md");
    });

    it("should only flag slices missing criteria", () => {
        writeFileSync(join(tmp, ".adlc/slices/01-good.md"), loadFixture("planner", "slice-01-plant-list.valid.md"));
        writeFileSync(join(tmp, ".adlc/slices/02-bad.md"), loadFixture("planner", "slice-no-criteria.invalid.md"));
        const problems = sliceCriteriaCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("02-bad.md");
        expect(problems[0]).not.toContain("01-good.md");
    });
});
