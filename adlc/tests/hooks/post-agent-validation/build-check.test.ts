import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildCheck } from "../../../src/hooks/post-agent-validation/build-check.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("buildCheck", () => {
    it("should return an array", async () => {
        const result = await buildCheck(REPO_ROOT);
        expect(Array.isArray(result)).toBe(true);
    });
});
