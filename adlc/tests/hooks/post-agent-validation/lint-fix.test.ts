import { beforeEach, describe, expect, it, vi } from "vitest";

import { run } from "../../../src/hooks/post-agent-validation/utils.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>()
}));

import { lintFix } from "../../../src/hooks/post-agent-validation/lint-fix.js";

describe("post-agent-validation lint-fix", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns empty array on success", async () => {
        vi.mocked(run).mockResolvedValue({ ok: true, stdout: "", stderr: "", code: undefined });
        const result = await lintFix("/tmp/test");
        expect(result).toEqual([]);

        // Post-agent version must NOT stage changes (no git add -u)
        expect(run).toHaveBeenCalledTimes(1);
        expect(run).toHaveBeenCalledWith("/tmp/test", "pnpm lint-fix");
    });

    it("returns error when lint-fix fails", async () => {
        vi.mocked(run).mockResolvedValue({ ok: false, stdout: "", stderr: "Lint error", code: 1 });
        const result = await lintFix("/tmp/test");
        expect(result).toHaveLength(1);
        expect(result[0]).toContain("[lint-fix] Lint autofix failed");
    });
});
