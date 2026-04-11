import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { criteriaCoverageCheck } from "../../../../src/hooks/post-agent-validation/reviewer/criteria-coverage-check.js";
import { loadFixture } from "../../../fixtures/load.js";

describe("criteria-coverage-check", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-cc-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should return [] when results file does not exist", () => {
        expect(criteriaCoverageCheck(tmp)).toHaveLength(0);
    });

    it("should return [] when current-slice.md does not exist", () => {
        writeFileSync(join(tmp, ".adlc/verification-results.md"), "# Verification Results\n\n- [x] Some criterion\n");
        expect(criteriaCoverageCheck(tmp)).toHaveLength(0);
    });

    it("should pass when all criteria are covered", () => {
        writeFileSync(join(tmp, ".adlc/current-slice.md"), loadFixture("planner", "slice-01-plant-list.valid.md"));
        writeFileSync(join(tmp, ".adlc/verification-results.md"), loadFixture("reviewer", "results-slice-1-all-pass.valid.md"));
        expect(criteriaCoverageCheck(tmp)).toHaveLength(0);
    });

    it("should fail when criteria are missing from results", () => {
        writeFileSync(join(tmp, ".adlc/current-slice.md"), loadFixture("planner", "slice-02-watering.valid.md"));
        writeFileSync(
            join(tmp, ".adlc/verification-results.md"),
            [
                "# Verification Results: Slice 2",
                "",
                "## Passed",
                "",
                "- [x] Shows water level indicator",
                "",
                "## Failed",
                "",
                "## Sanity Issues"
            ].join("\n")
        );
        const problems = criteriaCoverageCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("2 acceptance criteria");
        expect(problems[0]).toContain("indicator turns red");
        expect(problems[0]).toContain("clicking water button");
    });

    it("should count failed criteria as covered", () => {
        writeFileSync(join(tmp, ".adlc/current-slice.md"), loadFixture("planner", "slice-02-watering.valid.md"));
        writeFileSync(join(tmp, ".adlc/verification-results.md"), loadFixture("reviewer", "results-slice-2-with-failure.valid.md"));
        expect(criteriaCoverageCheck(tmp)).toHaveLength(0);
    });

    it("should match criteria despite spacing and case differences", () => {
        writeFileSync(join(tmp, ".adlc/current-slice.md"), "# Slice 1\n\n- [ ] Shows  a   3-column   GRID\n- [ ]   each CARD has  a thumbnail\n");
        writeFileSync(
            join(tmp, ".adlc/verification-results.md"),
            "# Verification Results: Slice 1\n\n## Passed\n\n- [x] shows a 3-column grid\n- [x] Each card has a thumbnail\n"
        );
        expect(criteriaCoverageCheck(tmp)).toHaveLength(0);
    });
});
