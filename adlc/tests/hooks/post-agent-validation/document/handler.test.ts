import { describe, expect, it, vi } from "vitest";

import { handleDocument } from "../../../../src/hooks/post-agent-validation/document/handler.js";

vi.mock("../../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>().mockResolvedValue({ ok: true, stdout: "", stderr: "" })
}));

describe("document handler", () => {
    it("should return an array (oxfmt autofix on clean repo)", async () => {
        const problems = await handleDocument(process.cwd());
        expect(Array.isArray(problems)).toBe(true);
        expect(problems).toHaveLength(0);
    });
});
