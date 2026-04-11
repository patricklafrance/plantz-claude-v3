import { beforeEach, describe, expect, it, vi } from "vitest";

import { run } from "../../../src/hooks/post-agent-validation/utils.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>()
}));

import { lintFix } from "../../../src/hooks/pre-commit/lint-fix.js";

describe("pre-commit lint-fix", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns empty array and stages changes on success", async () => {
        vi.mocked(run).mockResolvedValue({ ok: true, stdout: "", stderr: "", code: undefined });
        const result = await lintFix("/tmp/test");
        expect(result).toEqual([]);

        // Should have called git add -u after lint-fix
        expect(run).toHaveBeenCalledWith("/tmp/test", "git add -u");
    });

    it("returns error when lint-fix fails", async () => {
        vi.mocked(run).mockResolvedValue({ ok: false, stdout: "", stderr: "Lint error", code: 1 });
        const result = await lintFix("/tmp/test");
        expect(result).toHaveLength(1);
        expect(result[0]).toContain("[lint-fix] Lint autofix failed");
    });
});
