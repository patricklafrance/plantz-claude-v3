import { describe, expect, it } from "vitest";

import { implementationNotesCheck } from "../../../../src/hooks/post-agent-validation/coder/implementation-notes-check.js";

describe("implementation-notes-check", () => {
    it("should pass when a file in the directory is in changed list", () => {
        const result = implementationNotesCheck([".adlc/implementation-notes/01-shared-types.md", "apps/host/src/index.ts"]);
        expect(result).toHaveLength(0);
    });

    it("should fail when no file in the directory is in changed list", () => {
        const result = implementationNotesCheck(["apps/host/src/index.ts"]);
        expect(result).toHaveLength(1);
        expect(result[0]).toContain("implementation-notes");
    });

    it("should fail when the old single-file path is in changed list", () => {
        const result = implementationNotesCheck([".adlc/implementation-notes.md"]);
        expect(result).toHaveLength(1);
    });

    it("should ignore non-md files in the directory", () => {
        const result = implementationNotesCheck([".adlc/implementation-notes/.gitkeep"]);
        expect(result).toHaveLength(1);
    });
});
