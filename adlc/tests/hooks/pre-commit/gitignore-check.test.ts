import { describe, expect, it, vi } from "vitest";

import { run } from "../../../src/hooks/post-agent-validation/utils.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>()
}));

import { gitignoreCheck } from "../../../src/hooks/pre-commit/gitignore-check.js";

describe("pre-commit gitignore-check", () => {
    it("returns empty array when .gitignore is not in the diff", async () => {
        vi.mocked(run).mockResolvedValue({ ok: true, stdout: "", stderr: "", code: undefined });
        const result = await gitignoreCheck("/tmp/test");
        expect(result).toEqual([]);
    });

    it("returns empty array when .gitignore changes do not un-ignore .adlc/", async () => {
        vi.mocked(run).mockResolvedValue({
            ok: true,
            stdout: "--- a/.gitignore\n+++ b/.gitignore\n+dist/\n+coverage/\n",
            stderr: "",
            code: undefined
        });
        const result = await gitignoreCheck("/tmp/test");
        expect(result).toEqual([]);
    });

    it("blocks when .gitignore un-ignores .adlc/ paths", async () => {
        vi.mocked(run).mockResolvedValue({
            ok: true,
            stdout: "--- a/.gitignore\n+++ b/.gitignore\n+!.adlc/plan-header.md\n+!.adlc/slices/\n",
            stderr: "",
            code: undefined
        });
        const result = await gitignoreCheck("/tmp/test");
        expect(result).toHaveLength(1);
        expect(result[0]).toContain("gitignore-check");
        expect(result[0]).toContain("!.adlc/plan-header.md");
        expect(result[0]).toContain("!.adlc/slices/");
    });

    it("allows .gitignore changes that don't un-ignore .adlc/", async () => {
        vi.mocked(run).mockResolvedValue({
            ok: true,
            stdout: "--- a/.gitignore\n+++ b/.gitignore\n+.adlc-logs/\n",
            stderr: "",
            code: undefined
        });
        const result = await gitignoreCheck("/tmp/test");
        expect(result).toEqual([]);
    });
});
