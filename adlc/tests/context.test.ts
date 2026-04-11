import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, afterEach } from "vitest";

import { resolveConfig } from "../src/config.js";
import { buildProjectContext, classifyWithHeuristics, contextToPreamble, discoverReferenceDocs } from "../src/context.js";
import type { DocCandidate } from "../src/context.js";

const mockClassifier = async (candidates: DocCandidate[]) => {
    return { architecture: [candidates[0].relPath] };
};

const failingClassifier = async () => {
    throw new Error("Agent unavailable");
};

describe("buildProjectContext", () => {
    const tmpBase = join(tmpdir(), "adlc-context-test");
    const dirs: string[] = [];

    function makeTmpDir(): string {
        const dir = join(tmpBase, `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        mkdirSync(dir, { recursive: true });
        dirs.push(dir);
        return dir;
    }

    afterEach(() => {
        for (const dir of dirs) {
            if (existsSync(dir)) {
                rmSync(dir, { recursive: true, force: true });
            }
        }
        dirs.length = 0;
    });

    it("includes commands from package.json scripts", async () => {
        const dir = makeTmpDir();
        writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { build: "turbo build", lint: "oxlint .", test: "vitest" } }));

        const config = resolveConfig({});
        const ctx = await buildProjectContext(dir, config);

        expect(ctx.commands.build).toBe("pnpm build");
        expect(ctx.commands.lint).toBe("pnpm lint");
        expect(ctx.commands.test).toBe("pnpm test");
    });

    it("only includes standardized scripts, not arbitrary ones", async () => {
        const dir = makeTmpDir();
        writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { build: "turbo build", "my-custom": "echo hi" } }));

        const config = resolveConfig({});
        const ctx = await buildProjectContext(dir, config);

        expect(ctx.commands.build).toBe("pnpm build");
        expect(ctx.commands["my-custom"]).toBeUndefined();
    });

    it("uses heuristic fallback when no classifier provided", async () => {
        const dir = makeTmpDir();
        const refDir = join(dir, "agent-docs");
        const refsDir = join(refDir, "references");
        mkdirSync(refsDir, { recursive: true });

        writeFileSync(join(refDir, "ARCHITECTURE.md"), "# Architecture");
        writeFileSync(join(refsDir, "placement.md"), "# Placement");
        writeFileSync(join(refsDir, "msw-tanstack-query.md"), "# Data");
        writeFileSync(join(refsDir, "storybook.md"), "# Storybook");
        writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: {} }));

        const config = resolveConfig({});
        const ctx = await buildProjectContext(dir, config);

        expect(ctx.referenceDocs.architecture).toEqual([expect.stringContaining("ARCHITECTURE.md")]);
        expect(ctx.referenceDocs.placement).toEqual([expect.stringContaining("placement.md")]);
        expect(ctx.referenceDocs.api).toEqual([expect.stringContaining("msw-tanstack-query.md")]);
        expect(ctx.referenceDocs.storybook).toEqual([expect.stringContaining("storybook.md")]);
    });

    it("uses provided classifier when given", async () => {
        const dir = makeTmpDir();
        const refDir = join(dir, "agent-docs");
        mkdirSync(refDir, { recursive: true });

        writeFileSync(join(refDir, "my-weird-name.md"), "# Architecture Overview");
        writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: {} }));

        const config = resolveConfig({});
        const ctx = await buildProjectContext(dir, config, mockClassifier);

        expect(ctx.referenceDocs.architecture).toEqual([expect.stringContaining("my-weird-name.md")]);
    });

    it("falls back to heuristics when classifier throws", async () => {
        const dir = makeTmpDir();
        const refDir = join(dir, "agent-docs");
        mkdirSync(refDir, { recursive: true });

        writeFileSync(join(refDir, "ARCHITECTURE.md"), "# Architecture");
        writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: {} }));

        const config = resolveConfig({});
        const ctx = await buildProjectContext(dir, config, failingClassifier);

        expect(ctx.referenceDocs.architecture).toEqual([expect.stringContaining("ARCHITECTURE.md")]);
    });

    it("returns empty referenceDocs when reference dir missing", async () => {
        const dir = makeTmpDir();
        writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: {} }));

        const config = resolveConfig({});
        const ctx = await buildProjectContext(dir, config);

        expect(ctx.referenceDocs).toEqual({});
    });

    it("reflects config overrides in structure", async () => {
        const dir = makeTmpDir();
        writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: {} }));

        const config = resolveConfig({
            structure: { apps: "./applications", hostApp: "web" },
            scaffolding: { packageMeta: { license: "MIT", author: "Test Author" } }
        });
        const ctx = await buildProjectContext(dir, config);

        expect(ctx.structure.apps).toBe("./applications");
        expect(ctx.structure.hostApp).toBe("applications/web");
        expect(ctx.structure.license).toBe("MIT");
        expect(ctx.structure.author).toBe("Test Author");
    });
});

describe("discoverReferenceDocs", () => {
    const tmpBase = join(tmpdir(), "adlc-discover-test");
    const dirs: string[] = [];

    function makeTmpDir(): string {
        const dir = join(tmpBase, `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        mkdirSync(dir, { recursive: true });
        dirs.push(dir);
        return dir;
    }

    afterEach(() => {
        for (const dir of dirs) {
            if (existsSync(dir)) {
                rmSync(dir, { recursive: true, force: true });
            }
        }
        dirs.length = 0;
    });

    it("returns candidates with relative paths and titles", () => {
        const dir = makeTmpDir();
        const refDir = join(dir, "docs");
        mkdirSync(refDir, { recursive: true });
        writeFileSync(join(refDir, "arch.md"), "# My Architecture\nContent here.");

        const candidates = discoverReferenceDocs(refDir, dir);

        expect(candidates).toHaveLength(1);
        expect(candidates[0].relPath).toBe("docs/arch.md");
        expect(candidates[0].title).toBe("My Architecture");
    });

    it("returns empty array for missing directory", () => {
        expect(discoverReferenceDocs("/nonexistent", "/tmp")).toEqual([]);
    });
});

describe("classifyWithHeuristics", () => {
    it("classifies by path and title text", () => {
        const candidates: DocCandidate[] = [
            { relPath: "docs/ARCHITECTURE.md", title: "Architecture" },
            { relPath: "docs/refs/storybook.md", title: "Storybook Conventions" }
        ];

        const result = classifyWithHeuristics(candidates);

        expect(result.architecture).toEqual(["docs/ARCHITECTURE.md"]);
        expect(result.storybook).toEqual(["docs/refs/storybook.md"]);
    });

    it("groups multiple files into the same category", () => {
        const candidates: DocCandidate[] = [
            { relPath: "docs/refs/tailwind-postcss.md", title: "Tailwind CSS" },
            { relPath: "docs/refs/color-mode.md", title: "Dark Mode" }
        ];

        const result = classifyWithHeuristics(candidates);

        expect(result.styling).toEqual(["docs/refs/tailwind-postcss.md", "docs/refs/color-mode.md"]);
    });
});

describe("contextToPreamble", () => {
    it("formats commands, reference docs, and structure as markdown", () => {
        const preamble = contextToPreamble({
            commands: { build: "pnpm build", test: "pnpm test" },
            referenceDocs: { architecture: ["agent-docs/ARCHITECTURE.md"] },
            structure: {
                apps: "./apps",
                hostApp: "apps/host",
                modules: "./modules",
                packages: "./packages",
                license: "Apache-2.0"
            }
        });

        expect(preamble).toContain("## Project context");
        expect(preamble).toContain("### Commands");
        expect(preamble).toContain("- build: `pnpm build`");
        expect(preamble).toContain("- test: `pnpm test`");
        expect(preamble).toContain("### Reference docs");
        expect(preamble).toContain("- architecture: agent-docs/ARCHITECTURE.md");
        expect(preamble).toContain("### Structure");
        expect(preamble).toContain("- Apps: ./apps");
        expect(preamble).toContain("- License: Apache-2.0");
    });

    it("omits commands section when empty", () => {
        const preamble = contextToPreamble({
            commands: {},
            referenceDocs: {},
            structure: {
                apps: "./apps",
                hostApp: "apps/host",
                modules: "./modules",
                packages: "./packages",
                license: "Apache-2.0"
            }
        });

        expect(preamble).not.toContain("### Commands");
    });

    it("includes author when present", () => {
        const preamble = contextToPreamble({
            commands: {},
            referenceDocs: {},
            structure: {
                apps: "./apps",
                hostApp: "apps/host",
                modules: "./modules",
                packages: "./packages",
                license: "Apache-2.0",
                author: "Patrick Lafrance"
            }
        });

        expect(preamble).toContain("- Author: Patrick Lafrance");
    });
});
