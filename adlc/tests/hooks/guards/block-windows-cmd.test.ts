import { describe, expect, it } from "vitest";

import checkBlockWindowsCmd from "../../../src/hooks/guards/block-windows-cmd.js";

describe("block-windows-cmd", () => {
    it("should block cmd /c", () => {
        expect(checkBlockWindowsCmd("Bash", { command: "cmd /c dir" })).toEqual({
            action: "block",
            reason: "Blocked: use bash directly, not Windows cmd."
        });
    });

    it("should block cmd //c", () => {
        expect(checkBlockWindowsCmd("Bash", { command: "cmd //c pnpm lint" })?.reason).toContain("Windows cmd");
    });

    it("should block cmd.exe", () => {
        expect(checkBlockWindowsCmd("Bash", { command: "cmd.exe /c pnpm lint" })?.reason).toContain("Windows cmd");
    });

    it("should block cmd in chained segments", () => {
        expect(checkBlockWindowsCmd("Bash", { command: "cd /repo && cmd /c pnpm lint" })?.reason).toContain("Windows cmd");
    });

    it("should allow normal bash commands", () => {
        expect(checkBlockWindowsCmd("Bash", { command: "pnpm lint" })).toBeNull();
    });
});
