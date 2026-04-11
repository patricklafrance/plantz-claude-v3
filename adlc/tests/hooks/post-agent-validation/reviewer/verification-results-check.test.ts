import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resultsFileCheck } from "../../../../src/hooks/post-agent-validation/reviewer/verification-results-check.js";
import { loadFixture } from "../../../fixtures/load.js";

describe("verification-results-check", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-rf-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should fail when verification-results.md is missing", () => {
        const problems = resultsFileCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("Missing deliverable");
    });

    it("should fail when verification-results.md is empty", () => {
        writeFileSync(join(tmp, ".adlc/verification-results.md"), "");
        const problems = resultsFileCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("Missing deliverable");
    });

    it("should pass when verification-results.md exists and is non-empty", () => {
        writeFileSync(join(tmp, ".adlc/verification-results.md"), loadFixture("reviewer", "results-slice-1-all-pass.valid.md"));
        expect(resultsFileCheck(tmp)).toHaveLength(0);
    });
});
