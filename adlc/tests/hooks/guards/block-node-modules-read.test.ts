import { describe, expect, it } from "vitest";

import checkBlockNodeModulesRead from "../../../src/hooks/guards/block-node-modules-read.js";

describe("block-node-modules-read", () => {
    it("should block Read calls into node_modules", () => {
        expect(checkBlockNodeModulesRead("Read", { file_path: "node_modules/@base-ui/react/foo.js" })).toEqual({
            action: "block",
            reason: "Blocked: don't read library source in node_modules (type definitions — .d.ts, .d.mts, .d.cts — are allowed)."
        });
    });

    it("should block Read calls into nested node_modules paths", () => {
        expect(checkBlockNodeModulesRead("Read", { file_path: "C:\\repo\\node_modules\\pkg\\index.js" })?.reason).toContain("library source");
    });

    it("should allow Read calls to .d.ts files in node_modules", () => {
        expect(checkBlockNodeModulesRead("Read", { file_path: "node_modules/@tanstack/react-query/dist/esm/transactions.d.ts" })).toBeNull();
    });

    it("should allow Read calls to .d.mts files in node_modules", () => {
        expect(checkBlockNodeModulesRead("Read", { file_path: "node_modules/@tanstack/react-query/dist/esm/index.d.mts" })).toBeNull();
    });

    it("should allow Read calls to .d.cts files in node_modules", () => {
        expect(checkBlockNodeModulesRead("Read", { file_path: "node_modules/@tanstack/react-query/dist/cjs/index.d.cts" })).toBeNull();
    });

    it("should allow Read calls to .d.ts files in nested node_modules", () => {
        expect(
            checkBlockNodeModulesRead("Read", {
                file_path:
                    "C:\\repo\\node_modules\\.pnpm\\@tanstack+react-query@5.90.21\\node_modules\\@tanstack\\react-query\\dist\\esm\\useQuery.d.ts"
            })
        ).toBeNull();
    });

    it("should block Read calls to .d.ts.map files in node_modules", () => {
        expect(checkBlockNodeModulesRead("Read", { file_path: "node_modules/@tanstack/react-query/dist/esm/index.d.ts.map" })?.reason).toContain(
            "library source"
        );
    });

    it("should allow Read calls outside node_modules", () => {
        expect(checkBlockNodeModulesRead("Read", { file_path: "packages/components/src/index.ts" })).toBeNull();
    });

    it("should block Glob patterns targeting node_modules", () => {
        expect(checkBlockNodeModulesRead("Glob", { pattern: "**/node_modules/**/*.js" })?.reason).toContain("library source");
    });

    it("should block Glob when path targets node_modules", () => {
        expect(checkBlockNodeModulesRead("Glob", { pattern: "**/*.ts", path: "node_modules/.pnpm/@tanstack" })?.reason).toContain("library source");
    });

    it("should allow Glob patterns targeting .d.ts in node_modules", () => {
        expect(
            checkBlockNodeModulesRead("Glob", {
                pattern: "**/node_modules/.pnpm/@tanstack+react-query*/node_modules/@tanstack/react-query/**/*.d.ts"
            })
        ).toBeNull();
    });

    it("should allow Glob patterns targeting .d.mts in node_modules", () => {
        expect(checkBlockNodeModulesRead("Glob", { pattern: "**/node_modules/@tanstack/react-query/**/*.d.mts" })).toBeNull();
    });

    it("should allow Glob patterns that do not target node_modules", () => {
        expect(checkBlockNodeModulesRead("Glob", { pattern: "packages/**/*.ts" })).toBeNull();
    });

    it("should block bash search commands into node_modules", () => {
        expect(checkBlockNodeModulesRead("Bash", { command: "rg BaseUI node_modules/@base-ui" })?.reason).toContain("library source");
    });

    it("should block bash file reads into node_modules", () => {
        expect(checkBlockNodeModulesRead("Bash", { command: "cat node_modules/foo/index.js" })?.reason).toContain("library source");
    });

    it("should block chained bash inspection commands into node_modules", () => {
        expect(checkBlockNodeModulesRead("Bash", { command: "cd /repo && find node_modules -name '*.d.ts'" })?.reason).toContain("library source");
    });

    it("should block bash inspection of node_modules when path contains s before node_modules", () => {
        expect(checkBlockNodeModulesRead("Bash", { command: "cat /some/node_modules/pkg/index.js" })?.reason).toContain("library source");
    });

    it("should allow bash reads of .d.ts files in node_modules", () => {
        expect(checkBlockNodeModulesRead("Bash", { command: "cat node_modules/@types/react/index.d.ts" })).toBeNull();
    });

    it("should allow bash reads of .d.mts files in node_modules", () => {
        expect(checkBlockNodeModulesRead("Bash", { command: "head node_modules/@tanstack/react-query/dist/index.d.mts" })).toBeNull();
    });

    it("should allow bash commands that do not inspect node_modules", () => {
        expect(checkBlockNodeModulesRead("Bash", { command: "rg PlantList packages/api/src" })).toBeNull();
    });
});
