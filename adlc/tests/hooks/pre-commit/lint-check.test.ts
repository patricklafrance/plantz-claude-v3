import { describe, expect, it, vi } from "vitest";

import { run } from "../../../src/hooks/post-agent-validation/utils.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>()
}));

import { lintCheck } from "../../../src/hooks/pre-commit/lint-check.js";

describe("pre-commit lint-check", () => {
    it("returns empty array on success", async () => {
        vi.mocked(run).mockResolvedValue({ ok: true, stdout: "", stderr: "", code: undefined });
        const result = await lintCheck("/tmp/test");
        expect(result).toEqual([]);
    });

    it("returns error message on failure", async () => {
        vi.mocked(run).mockResolvedValue({ ok: false, stdout: "unused import", stderr: "", code: 1 });
        const result = await lintCheck("/tmp/test");
        expect(result).toHaveLength(1);
        expect(result[0]).toContain("[lint] Lint failed");
    });
});
