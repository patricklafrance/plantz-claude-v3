import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { sliceFilesCheck } from "../../../../src/hooks/post-agent-validation/planner/slice-files-check.js";
import { loadFixture } from "../../../fixtures/load.js";

describe("slice-files-check", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-sf-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should fail when no slices directory exists", () => {
        const problems = sliceFilesCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("no slice files");
    });

    it("should fail when slices directory is empty", () => {
        mkdirSync(join(tmp, ".adlc/slices"), { recursive: true });
        const problems = sliceFilesCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("no slice files");
    });

    it("should pass when at least one .md slice exists", () => {
        mkdirSync(join(tmp, ".adlc/slices"), { recursive: true });
        writeFileSync(join(tmp, ".adlc/slices/01-plant-list.md"), loadFixture("planner", "slice-01-plant-list.valid.md"));
        expect(sliceFilesCheck(tmp)).toHaveLength(0);
    });
});
