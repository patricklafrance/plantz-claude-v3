import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { engagementCheck } from "../../../../src/hooks/post-agent-validation/domain-mapper/engagement-check.js";

describe("engagement-check", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-ec-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("should pass when no verdict file exists", () => {
        expect(engagementCheck(tmp)).toHaveLength(0);
    });

    it("should pass when verdict has only low-confidence concerns", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            [
                "# Challenge Verdict",
                "",
                "| Concern | Sprawl position | Cohesion position | Verdict | Confidence |",
                "| --- | --- | --- | --- | --- |",
                "| Minor naming | sprawl says X | cohesion says Y | resolved | low |"
            ].join("\n")
        );
        writeFileSync(join(tmp, ".adlc/domain-mapping.md"), "# Mapping\n\nSome content.\n");
        expect(engagementCheck(tmp)).toHaveLength(0);
    });

    it("should fail when medium+ concerns exist but mapping has no Challenge Resolution section", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            [
                "# Challenge Verdict",
                "",
                "| Concern | Sprawl position | Cohesion position | Verdict | Confidence |",
                "| --- | --- | --- | --- | --- |",
                "| Route overlap | sprawl says X | cohesion says Y | needs-action | high |"
            ].join("\n")
        );
        writeFileSync(join(tmp, ".adlc/domain-mapping.md"), "# Mapping\n\n## Analysis\n\nSome content.\n");
        const problems = engagementCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("Challenge Resolution");
    });

    it("should fail when concern name is missing from Challenge Resolution section", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            [
                "# Challenge Verdict",
                "",
                "| Concern | Sprawl position | Cohesion position | Verdict | Confidence |",
                "| --- | --- | --- | --- | --- |",
                "| Route overlap | sprawl says X | cohesion says Y | needs-action | medium |"
            ].join("\n")
        );
        // Section exists but doesn't mention the specific concern name
        writeFileSync(
            join(tmp, ".adlc/domain-mapping.md"),
            ["# Mapping", "", "## Challenge Resolution", "", "We addressed the naming concern.", ""].join("\n")
        );
        const problems = engagementCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("Route overlap");
    });

    it("should pass when all concerns are addressed in Challenge Resolution section", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            [
                "# Challenge Verdict",
                "",
                "| Concern | Sprawl position | Cohesion position | Verdict | Confidence |",
                "| --- | --- | --- | --- | --- |",
                "| Route overlap | sprawl says X | cohesion says Y | needs-action | high |",
                "| Data duplication | sprawl says A | cohesion says B | resolved | medium |"
            ].join("\n")
        );
        writeFileSync(
            join(tmp, ".adlc/domain-mapping.md"),
            [
                "# Mapping",
                "",
                "## Challenge Resolution",
                "",
                "**Route overlap**: We moved the conflicting route to a shared layout.",
                "",
                "**Data duplication**: Resolved by extracting to @packages/core-plants.",
                ""
            ].join("\n")
        );
        const problems = engagementCheck(tmp);
        expect(problems).toHaveLength(0);
    });

    it("should fail when domain-mapping.md cannot be read", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            [
                "# Challenge Verdict",
                "",
                "| Concern | Sprawl position | Cohesion position | Verdict | Confidence |",
                "| --- | --- | --- | --- | --- |",
                "| Route overlap | sprawl says X | cohesion says Y | needs-action | high |"
            ].join("\n")
        );
        // No domain-mapping.md written
        const problems = engagementCheck(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("cannot read");
    });
});
