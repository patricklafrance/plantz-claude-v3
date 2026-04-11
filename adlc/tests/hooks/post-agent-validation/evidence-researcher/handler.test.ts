import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleEvidenceResearcher } from "../../../../src/hooks/post-agent-validation/evidence-researcher/handler.js";

describe("evidence-researcher handler", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-er-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should fail when current-evidence-findings.md does not exist", () => {
        const problems = handleEvidenceResearcher(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("current-evidence-findings.md");
        expect(problems[0]).toContain("Missing deliverable");
    });

    it("should fail when current-evidence-findings.md is empty", () => {
        writeFileSync(join(tmp, ".adlc/current-evidence-findings.md"), "");
        const problems = handleEvidenceResearcher(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("Missing deliverable");
    });

    it("should pass when current-evidence-findings.md exists and is non-empty", () => {
        writeFileSync(join(tmp, ".adlc/current-evidence-findings.md"), "# Evidence Findings\n\n## Gap 1\n\nFindings here.\n");
        expect(handleEvidenceResearcher(tmp)).toHaveLength(0);
    });
});
