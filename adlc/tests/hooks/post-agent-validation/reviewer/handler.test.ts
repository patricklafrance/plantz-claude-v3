import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleReviewer } from "../../../../src/hooks/post-agent-validation/reviewer/handler.js";
import { loadFixture } from "../../../fixtures/load.js";

describe("reviewer handler (orchestration)", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-rev-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should short-circuit when results file is missing (skip coverage check)", () => {
        const problems = handleReviewer(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("Missing deliverable");
    });

    it("should run coverage check when results file exists", () => {
        writeFileSync(join(tmp, ".adlc/current-slice.md"), loadFixture("planner", "slice-01-plant-list.valid.md"));
        // Results exist but have no criteria -> coverage check kicks in
        writeFileSync(
            join(tmp, ".adlc/verification-results.md"),
            ["# Verification Results: Slice 1", "", "## Passed", "", "## Failed", "", "## Sanity Issues"].join("\n")
        );
        const problems = handleReviewer(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("acceptance criteria");
    });

    it("should pass when all deliverables are valid", () => {
        writeFileSync(join(tmp, ".adlc/current-slice.md"), loadFixture("planner", "slice-01-plant-list.valid.md"));
        writeFileSync(join(tmp, ".adlc/verification-results.md"), loadFixture("reviewer", "results-slice-1-all-pass.valid.md"));
        expect(handleReviewer(tmp)).toHaveLength(0);
    });
});
