import { describe, expect, it, vi } from "vitest";

import { run } from "../../../src/hooks/post-agent-validation/utils.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>()
}));

import { testsCheck } from "../../../src/hooks/pre-commit/tests-check.js";

describe("pre-commit tests-check", () => {
    it("returns empty array on success", async () => {
        vi.mocked(run).mockResolvedValue({ ok: true, stdout: "", stderr: "", code: undefined });
        const result = await testsCheck("/tmp/test");
        expect(result).toEqual([]);
    });

    it("returns error message on failure", async () => {
        vi.mocked(run).mockResolvedValue({ ok: false, stdout: "FAIL src/app.test.ts", stderr: "", code: 1 });
        const result = await testsCheck("/tmp/test");
        expect(result).toHaveLength(1);
        expect(result[0]).toContain("[test] Tests failed");
    });
});
