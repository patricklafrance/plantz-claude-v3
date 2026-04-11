import { describe, expect, it, vi } from "vitest";

import { run } from "../../../src/hooks/post-agent-validation/utils.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>()
}));

import { buildCheck } from "../../../src/hooks/pre-commit/build-check.js";

describe("pre-commit build-check", () => {
    it("returns empty array on success", async () => {
        vi.mocked(run).mockResolvedValue({ ok: true, stdout: "", stderr: "", code: undefined });
        const result = await buildCheck("/tmp/test");
        expect(result).toEqual([]);
    });

    it("returns error message on failure", async () => {
        vi.mocked(run).mockResolvedValue({ ok: false, stdout: "Error: TS2322", stderr: "", code: 1 });
        const result = await buildCheck("/tmp/test");
        expect(result).toHaveLength(1);
        expect(result[0]).toContain("[build] Build failed");
        expect(result[0]).toContain("TS2322");
    });
});
