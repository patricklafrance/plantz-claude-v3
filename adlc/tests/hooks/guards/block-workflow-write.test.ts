import { describe, expect, it } from "vitest";

import checkBlockWorkflowWrite from "../../../src/hooks/guards/block-workflow-write.js";

describe("block-workflow-write", () => {
    it("blocks Edit on .github/workflows/ files", () => {
        expect(checkBlockWorkflowWrite("Edit", { file_path: "/repo/.github/workflows/ci.yml" })).toEqual({
            action: "block",
            reason: expect.stringContaining("workflows")
        });
    });

    it("blocks Write on .github/workflows/ files", () => {
        expect(checkBlockWorkflowWrite("Write", { file_path: "/repo/.github/workflows/chromatic.yml" })).toEqual({
            action: "block",
            reason: expect.stringContaining("workflows")
        });
    });

    it("blocks Bash commands with absolute workflow paths", () => {
        expect(checkBlockWorkflowWrite("Bash", { command: "sed -i 's/x/y/' /repo/.github/workflows/ci.yml" })).toEqual({
            action: "block",
            reason: expect.stringContaining("workflows")
        });
    });

    it("blocks Bash commands with relative workflow paths", () => {
        expect(checkBlockWorkflowWrite("Bash", { command: "echo foo > .github/workflows/ci.yml" })).toEqual({
            action: "block",
            reason: expect.stringContaining("workflows")
        });
    });

    it("allows Edit on non-workflow files", () => {
        expect(checkBlockWorkflowWrite("Edit", { file_path: "/repo/src/config.ts" })).toBeNull();
    });

    it("allows Read on .github/workflows/ files", () => {
        expect(checkBlockWorkflowWrite("Read", { file_path: "/repo/.github/workflows/ci.yml" })).toBeNull();
    });

    it("allows Bash commands not targeting workflows", () => {
        expect(checkBlockWorkflowWrite("Bash", { command: "pnpm test" })).toBeNull();
    });

    it("handles backslash paths", () => {
        expect(checkBlockWorkflowWrite("Edit", { file_path: "C:\\repo\\.github\\workflows\\ci.yml" })).toEqual({
            action: "block",
            reason: expect.stringContaining("workflows")
        });
    });
});
