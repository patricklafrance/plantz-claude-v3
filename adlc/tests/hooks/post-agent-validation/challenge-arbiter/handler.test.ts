import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleChallengeArbiter } from "../../../../src/hooks/post-agent-validation/challenge-arbiter/handler.js";

describe("challenge-arbiter handler", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-arbiter-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("passes when verdict contains Approved status", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            "# Challenge Verdict\n\nSome content.\n\n## Status\n\nApproved"
        );
        expect(handleChallengeArbiter(tmp)).toEqual([]);
    });

    it("passes when verdict contains Revision required status", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            "# Challenge Verdict\n\n## Status\n\nRevision required — sprawl risk in slice 3."
        );
        expect(handleChallengeArbiter(tmp)).toEqual([]);
    });

    it("fails when verdict file is missing", () => {
        const problems = handleChallengeArbiter(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("current-challenge-verdict.md");
    });

    it("fails when verdict file is empty", () => {
        writeFileSync(join(tmp, ".adlc/current-challenge-verdict.md"), "");
        const problems = handleChallengeArbiter(tmp);
        expect(problems).toHaveLength(1);
    });

    it("fails when verdict has no Status section", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            "# Challenge Verdict\n\nContent but no status."
        );
        const problems = handleChallengeArbiter(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("## Status");
    });

    it("fails when Status value is not Approved or Revision required", () => {
        writeFileSync(
            join(tmp, ".adlc/current-challenge-verdict.md"),
            "# Challenge Verdict\n\n## Status\n\nUnresolved"
        );
        const problems = handleChallengeArbiter(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("Unresolved");
    });
});
