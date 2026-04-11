import { describe, expect, it, vi } from "vitest";

// ── Mock run ────────────────────────────────────────────────────────────────

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>().mockResolvedValue({ ok: true, stdout: "", stderr: "" })
}));

// ── Import under test ───────────────────────────────────────────────────────

import { handlePreCommit } from "../../../src/hooks/pre-commit/handler.js";

// ── Tests ───────────────────────────────────────────────────────────────────

describe("handlePreCommit", () => {
    it("returns empty array when all checks pass", async () => {
        const problems = await handlePreCommit("/tmp/test-project");
        expect(problems).toEqual([]);
    });
});
