import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { revisionSliceRefsCheck } from "../../../../src/hooks/post-agent-validation/plan-gate/revision-slice-refs-check.js";
import { loadFixture } from "../../../fixtures/load.js";

describe("revision-slice-refs-check", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-arch-sr-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should pass when no revision file exists", () => {
        expect(revisionSliceRefsCheck(tmp)).toHaveLength(0);
    });

    it("should pass when revision references a slice", () => {
        writeFileSync(join(tmp, ".adlc/plan-gate-revision.md"), loadFixture("plan-gate", "revision.valid.md"));
        expect(revisionSliceRefsCheck(tmp)).toHaveLength(0);
    });

    it("should pass with various slice reference formats", () => {
        writeFileSync(join(tmp, ".adlc/plan-gate-revision.md"), "Slice 3 conflicts with Slice 12\n");
        expect(revisionSliceRefsCheck(tmp)).toHaveLength(0);
    });

    it("should fail when no slice is referenced", () => {
        writeFileSync(join(tmp, ".adlc/plan-gate-revision.md"), loadFixture("plan-gate", "revision-no-refs.invalid.md"));
        const problems = revisionSliceRefsCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("slice references");
    });
});
