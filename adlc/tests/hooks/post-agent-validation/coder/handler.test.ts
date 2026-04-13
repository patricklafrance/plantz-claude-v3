import { describe, expect, it, vi } from "vitest";

import { handleCoder } from "../../../../src/hooks/post-agent-validation/coder/handler.js";

vi.mock("../../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>().mockResolvedValue({ ok: true, stdout: "", stderr: "" }),
    hasFile: vi.fn<any>().mockReturnValue(false),
    listFiles: vi.fn<any>().mockReturnValue([]),
    getChangedFiles: vi.fn<any>().mockReturnValue([]),
    resolveRunDir: vi.fn<any>((cwd: string) => cwd + "/.adlc")
}));

describe("coder handler (full pipeline)", () => {
    it("should return an array of problems", async () => {
        const problems = await handleCoder(process.cwd(), {});
        expect(Array.isArray(problems)).toBe(true);
        // On a clean repo without .adlc/implementation-notes.md, we expect at least that check to fail
        expect(problems.some(p => p.includes("implementation-notes"))).toBe(true);
    });
});
