import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { lintCheck } from "../../../src/hooks/post-agent-validation/lint-check.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>().mockResolvedValue({ ok: true, stdout: "", stderr: "" })
}));

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("lintCheck", () => {
    it("should return an array", async () => {
        const result = await lintCheck(REPO_ROOT);
        expect(Array.isArray(result)).toBe(true);
    });
});
