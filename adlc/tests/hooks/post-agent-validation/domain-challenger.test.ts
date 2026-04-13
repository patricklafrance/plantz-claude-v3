import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { handleChallengeArbiter } from "../../../src/hooks/post-agent-validation/challenge-arbiter/handler.js";

/**
 * domain-challenger reuses the challenge-arbiter handler (same verdict file check).
 * These tests confirm the handler works for the orchestrator scenario.
 */
describe("domain-challenger handler (reuses challenge-arbiter)", () => {
    let tmp: string;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), "adlc-domain-challenger-"));
        mkdirSync(join(tmp, ".adlc"), { recursive: true });
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("passes when verdict contains Approved status", () => {
        writeFileSync(join(tmp, ".adlc/current-challenge-verdict.md"), "# Challenge Verdict\n\nSome content.\n\n## Status\n\nApproved");
        expect(handleChallengeArbiter(tmp)).toEqual([]);
    });

    it("fails when verdict file is missing", () => {
        const problems = handleChallengeArbiter(tmp);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("current-challenge-verdict.md");
    });
});
