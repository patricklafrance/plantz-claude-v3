import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { getChangedFiles } from "../../../src/hooks/post-agent-validation/utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");

describe("getChangedFiles", () => {
    it("should return an array on a real repo", () => {
        const files = getChangedFiles(REPO_ROOT);
        expect(Array.isArray(files)).toBe(true);
    });

    it("should return [] for a nonexistent path", () => {
        const files = getChangedFiles("/nonexistent/path");
        expect(files).toEqual([]);
    });
});
