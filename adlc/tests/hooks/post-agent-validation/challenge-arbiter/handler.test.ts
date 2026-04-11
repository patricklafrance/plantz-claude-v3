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

    it("passes when verdict file exists", () => {
        writeFileSync(join(tmp, ".adlc/current-challenge-verdict.md"), "# Challenge Verdict\n\nContent here.");
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
});
