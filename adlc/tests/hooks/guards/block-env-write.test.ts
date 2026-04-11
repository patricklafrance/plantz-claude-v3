import { describe, expect, it } from "vitest";

import checkBlockEnvWrite from "../../../src/hooks/guards/block-env-write.js";

describe("block-env-write", () => {
    it("blocks Edit on .env", () => {
        expect(checkBlockEnvWrite("Edit", { file_path: "/repo/.env" })).toEqual({
            action: "block",
            reason: expect.stringContaining(".env")
        });
    });

    it("blocks Write on .env", () => {
        expect(checkBlockEnvWrite("Write", { file_path: "/repo/.env" })).toEqual({
            action: "block",
            reason: expect.stringContaining(".env")
        });
    });

    it("blocks Edit on .env.local", () => {
        expect(checkBlockEnvWrite("Edit", { file_path: "/repo/.env.local" })).not.toBeNull();
    });

    it("blocks Write on .env.production", () => {
        expect(checkBlockEnvWrite("Write", { file_path: "apps/host/.env.production" })).not.toBeNull();
    });

    it("allows Edit on regular files", () => {
        expect(checkBlockEnvWrite("Edit", { file_path: "/repo/src/config.ts" })).toBeNull();
    });

    it("allows Read on .env files", () => {
        expect(checkBlockEnvWrite("Read", { file_path: "/repo/.env" })).toBeNull();
    });

    it("allows Bash tool", () => {
        expect(checkBlockEnvWrite("Bash", { command: "cat .env" })).toBeNull();
    });

    it("does not match files containing env in the name", () => {
        expect(checkBlockEnvWrite("Edit", { file_path: "/repo/src/environment.ts" })).toBeNull();
    });
});
