import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
    buildWorkspaceMap,
    extractSection,
    generatePackageMap,
    globSourceFiles,
    parseReferences,
    resolvePackageRef
} from "../../../../../src/workflow/steps/slices/worktree/package-map.js";

// ── extractSection ──────────────────────────────────────

describe("extractSection", () => {
    it("extracts content between heading and next section", () => {
        const md = "## Alpha\n\nAlpha content\n\n## Beta\n\nBeta content";
        expect(extractSection(md, "Alpha")).toBe("Alpha content");
    });

    it("extracts content when section is last", () => {
        const md = "## Intro\n\nIntro text\n\n## Reference Packages\n\n- `@pkg/a` — desc";
        expect(extractSection(md, "Reference Packages")).toBe("- `@pkg/a` — desc");
    });

    it("returns null when heading not found", () => {
        expect(extractSection("## Other\n\ntext", "Missing")).toBeNull();
    });
});

// ── parseReferences ─────────────────────────────────────

describe("parseReferences", () => {
    it("parses standard reference lines", () => {
        const section = "- `@packages/core-plants` — schema shape, collection factory\n- `@packages/api` — MSW handler patterns";
        const refs = parseReferences(section);

        expect(refs).toEqual([
            { name: "@packages/core-plants", description: "schema shape, collection factory" },
            { name: "@packages/api", description: "MSW handler patterns" }
        ]);
    });

    it("handles parenthetical annotations before the dash", () => {
        const section = "- `@packages/core-plants` (read-only) — schema shape";
        const refs = parseReferences(section);

        expect(refs).toEqual([{ name: "@packages/core-plants", description: "schema shape" }]);
    });

    it("ignores non-reference lines", () => {
        const section = "Some intro text\n\n- `@packages/a` — desc\n\nMore text";
        const refs = parseReferences(section);

        expect(refs).toHaveLength(1);
        expect(refs[0].name).toBe("@packages/a");
    });

    it("returns empty for empty section", () => {
        expect(parseReferences("")).toEqual([]);
    });
});

// ── buildWorkspaceMap ───────────────────────────────────

describe("buildWorkspaceMap", () => {
    let root: string;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), "pkgmap-ws-"));
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it("discovers packages under apps/, packages/, modules/", () => {
        createPackage(root, "packages/core-plants", "@packages/core-plants");
        createPackage(root, "modules/management", "@modules/management");
        createPackage(root, "apps/host", "@apps/host");

        const map = buildWorkspaceMap(root);

        expect(map.get("@packages/core-plants")).toBe(join(root, "packages/core-plants"));
        expect(map.get("@modules/management")).toBe(join(root, "modules/management"));
        expect(map.get("@apps/host")).toBe(join(root, "apps/host"));
    });

    it("skips node_modules directories", () => {
        createPackage(root, "packages/node_modules/hidden", "@hidden/pkg");

        const map = buildWorkspaceMap(root);

        expect(map.has("@hidden/pkg")).toBe(false);
    });

    it("returns empty map when no workspace dirs exist", () => {
        const map = buildWorkspaceMap(root);
        expect(map.size).toBe(0);
    });
});

// ── resolvePackageRef ───────────────────────────────────

describe("resolvePackageRef", () => {
    let root: string;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), "pkgmap-resolve-"));
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it("resolves a direct package name", () => {
        const pkgPath = join(root, "packages/core-plants");
        const map = new Map([["@packages/core-plants", pkgPath]]);

        const result = resolvePackageRef("@packages/core-plants", map, root);

        expect(result).not.toBeNull();
        expect(result!.displayPath).toBe("packages/core-plants");
        expect(result!.srcDir).toBe(join(pkgPath, "src"));
    });

    it("resolves a subpath export", () => {
        const pkgPath = join(root, "packages/api");
        mkdirSync(pkgPath, { recursive: true });
        writeFileSync(
            join(pkgPath, "package.json"),
            JSON.stringify({
                name: "@packages/api",
                exports: { "./entities": "./src/entities/index.ts" }
            })
        );

        const map = new Map([["@packages/api", pkgPath]]);
        const result = resolvePackageRef("@packages/api/entities", map, root);

        expect(result).not.toBeNull();
        expect(result!.displayPath).toBe("packages/api/src/entities");
    });

    it("resolves conditional exports", () => {
        const pkgPath = join(root, "packages/api");
        mkdirSync(pkgPath, { recursive: true });
        writeFileSync(
            join(pkgPath, "package.json"),
            JSON.stringify({
                name: "@packages/api",
                exports: {
                    "./handlers": {
                        import: "./src/handlers/index.ts",
                        require: "./src/handlers/index.cjs"
                    }
                }
            })
        );

        const map = new Map([["@packages/api", pkgPath]]);
        const result = resolvePackageRef("@packages/api/handlers", map, root);

        expect(result).not.toBeNull();
        expect(result!.displayPath).toBe("packages/api/src/handlers");
    });

    it("returns null for unknown package", () => {
        const map = new Map<string, string>();
        expect(resolvePackageRef("@packages/unknown", map, root)).toBeNull();
    });
});

// ── globSourceFiles ─────────────────────────────────────

describe("globSourceFiles", () => {
    let root: string;

    beforeEach(() => {
        root = mkdtempSync(join(tmpdir(), "pkgmap-glob-"));
    });

    afterEach(() => {
        rmSync(root, { recursive: true, force: true });
    });

    it("finds .ts and .tsx files recursively", () => {
        const srcDir = join(root, "src");
        mkdirSync(join(srcDir, "db"), { recursive: true });
        writeFileSync(join(srcDir, "index.ts"), "");
        writeFileSync(join(srcDir, "schema.ts"), "");
        writeFileSync(join(srcDir, "db", "collection.ts"), "");

        const files = globSourceFiles(srcDir, root);

        expect(files).toEqual(["src/db/collection.ts", "src/index.ts", "src/schema.ts"]);
    });

    it("excludes non-ts files", () => {
        const srcDir = join(root, "src");
        mkdirSync(srcDir, { recursive: true });
        writeFileSync(join(srcDir, "index.ts"), "");
        writeFileSync(join(srcDir, "readme.md"), "");
        writeFileSync(join(srcDir, "styles.css"), "");

        const files = globSourceFiles(srcDir, root);

        expect(files).toEqual(["src/index.ts"]);
    });

    it("skips node_modules", () => {
        const srcDir = join(root, "src");
        mkdirSync(join(srcDir, "node_modules", "dep"), { recursive: true });
        writeFileSync(join(srcDir, "index.ts"), "");
        writeFileSync(join(srcDir, "node_modules", "dep", "lib.ts"), "");

        const files = globSourceFiles(srcDir, root);

        expect(files).toEqual(["src/index.ts"]);
    });

    it("returns empty for missing directory", () => {
        expect(globSourceFiles(join(root, "nope"), root)).toEqual([]);
    });
});

// ── generatePackageMap (integration) ────────────────────

describe("generatePackageMap", () => {
    let worktree: string;

    beforeEach(() => {
        worktree = mkdtempSync(join(tmpdir(), "pkgmap-int-"));
    });

    afterEach(() => {
        rmSync(worktree, { recursive: true, force: true });
    });

    it("generates current-package-map.md from slice references", () => {
        // Set up workspace structure
        createPackage(worktree, "packages/core-plants", "@packages/core-plants");
        const srcDir = join(worktree, "packages/core-plants/src");
        mkdirSync(srcDir, { recursive: true });
        writeFileSync(join(srcDir, "index.ts"), "export {}");
        writeFileSync(join(srcDir, "schema.ts"), "export interface Plant {}");

        // Set up .adlc/current-slice.md with reference packages
        const adlcDir = join(worktree, ".adlc");
        mkdirSync(adlcDir, { recursive: true });
        writeFileSync(
            join(adlcDir, "current-slice.md"),
            "# Slice\n\n## Scope\n\nSome scope\n\n## Reference Packages\n\n- `@packages/core-plants` — schema shape, collection factory\n"
        );

        generatePackageMap(worktree);

        const output = readFileSync(join(adlcDir, "current-package-map.md"), "utf-8");
        expect(output).toContain("# Package Map");
        expect(output).toContain("@packages/core-plants");
        expect(output).toContain("src/index.ts");
        expect(output).toContain("src/schema.ts");
        expect(output).toContain("schema shape, collection factory");
    });

    it("no-ops when current-slice.md is missing", () => {
        const adlcDir = join(worktree, ".adlc");
        mkdirSync(adlcDir, { recursive: true });

        generatePackageMap(worktree);

        expect(existsSync(join(adlcDir, "current-package-map.md"))).toBe(false);
    });

    it("no-ops when slice has no Reference Packages section", () => {
        const adlcDir = join(worktree, ".adlc");
        mkdirSync(adlcDir, { recursive: true });
        writeFileSync(join(adlcDir, "current-slice.md"), "# Slice\n\n## Scope\n\nJust scope\n");

        generatePackageMap(worktree);

        expect(existsSync(join(adlcDir, "current-package-map.md"))).toBe(false);
    });

    it("handles unresolvable package references", () => {
        const adlcDir = join(worktree, ".adlc");
        mkdirSync(adlcDir, { recursive: true });
        writeFileSync(
            join(adlcDir, "current-slice.md"),
            "# Slice\n\n## Reference Packages\n\n- `@packages/nonexistent` — something\n"
        );

        generatePackageMap(worktree);

        const output = readFileSync(join(adlcDir, "current-package-map.md"), "utf-8");
        expect(output).toContain("@packages/nonexistent → (not found in workspace)");
    });
});

// ── Test helpers ────────────────────────────────────────

function createPackage(root: string, relPath: string, name: string): void {
    const pkgDir = join(root, relPath);
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, "package.json"), JSON.stringify({ name }));
}
