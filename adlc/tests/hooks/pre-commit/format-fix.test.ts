import { beforeEach, describe, expect, it, vi } from "vitest";

import { run } from "../../../src/hooks/post-agent-validation/utils.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>()
}));

import { formatFix } from "../../../src/hooks/pre-commit/format-fix.js";

describe("pre-commit format-fix", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    it("returns empty array and stages changes on success", async () => {
        vi.mocked(run).mockResolvedValue({ ok: true, stdout: "", stderr: "", code: undefined });
        const result = await formatFix("/tmp/test");
        expect(result).toEqual([]);

        // Should re-stage all indexed files (not just tracked) after formatting
        expect(run).toHaveBeenCalledWith("/tmp/test", "git diff --cached --name-only -z | xargs -0 git add --");
    });

    it("retries once on the known CSS import resolver race condition", async () => {
        vi.mocked(run)
            .mockResolvedValueOnce({ ok: false, stdout: "", stderr: "Cannot use 'in' operator to search for 'importer'", code: 1 })
            .mockResolvedValueOnce({ ok: true, stdout: "", stderr: "", code: undefined })
            .mockResolvedValue({ ok: true, stdout: "", stderr: "", code: undefined });

        const result = await formatFix("/tmp/test");
        expect(result).toEqual([]);

        // format-fix called twice (retry), then git add -u
        expect(run).toHaveBeenCalledTimes(3);
    });

    it("returns error when format-fix fails with non-transient error", async () => {
        vi.mocked(run).mockResolvedValue({ ok: false, stdout: "", stderr: "Unexpected token", code: 1 });
        const result = await formatFix("/tmp/test");
        expect(result).toHaveLength(1);
        expect(result[0]).toContain("[format] Auto-format failed");
    });
});
