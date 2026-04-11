import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { testsCheck } from "../../../src/hooks/post-agent-validation/tests-check.js";

vi.mock("../../../src/hooks/post-agent-validation/utils.js", () => ({
    run: vi.fn<any>().mockResolvedValue({ ok: true, stdout: "", stderr: "" })
}));

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("testsCheck", () => {
    it("should return an array", async () => {
        const result = await testsCheck(REPO_ROOT);
        expect(Array.isArray(result)).toBe(true);
    });
});
