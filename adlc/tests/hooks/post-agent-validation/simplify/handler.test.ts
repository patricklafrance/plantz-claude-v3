import { describe, expect, it, vi } from "vitest";

import { handleSimplify } from "../../../../src/hooks/post-agent-validation/simplify/handler.js";

vi.mock("../../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>().mockResolvedValue({ ok: true, stdout: "", stderr: "" }),
    hasFile: vi.fn<any>().mockReturnValue(false),
    listFiles: vi.fn<any>().mockReturnValue([]),
    getChangedFiles: vi.fn<any>().mockReturnValue([])
}));

describe("simplify handler (full pipeline)", () => {
    it("should return an array of problems", async () => {
        const problems = await handleSimplify(process.cwd());
        expect(Array.isArray(problems)).toBe(true);
        expect(problems).toHaveLength(0);
    });
});
