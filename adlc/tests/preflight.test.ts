import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, afterEach } from "vitest";

import { validateRepository } from "../src/preflight.js";

describe("validateRepository", () => {
    const tmpBase = join(tmpdir(), "adlc-preflight-test");
    const dirs: string[] = [];

    function makeTmpDir(): string {
        const dir = join(tmpBase, `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        mkdirSync(dir, { recursive: true });
        dirs.push(dir);
        return dir;
    }

    const REFERENCE_DIR = "agent-docs";

    const validPkg = {
        scripts: {
            build: "turbo build",
            lint: "turbo lint",
            test: "vitest run",
            typecheck: "tsc --noEmit",
            "lint-check": "oxlint .",
            "lint-fix": "oxlint --fix .",
            "format-check": "oxfmt --check .",
            "format-fix": "oxfmt --write .",
            knip: "knip",
            syncpack: "syncpack lint",
            "dev-app": "turbo dev --filter=@apps/host",
            "dev-storybook": "turbo dev --filter=@apps/storybook"
        },
        devDependencies: {
            "agent-browser": "^0.1.0"
        }
    };

    /** Write a valid package.json and create the reference directory. */
    function setupValidRepo(dir: string): void {
        writeFileSync(join(dir, "package.json"), JSON.stringify(validPkg));
        mkdirSync(join(dir, REFERENCE_DIR), { recursive: true });
    }

    afterEach(() => {
        for (const dir of dirs) {
            if (existsSync(dir)) {
                rmSync(dir, { recursive: true, force: true });
            }
        }
        dirs.length = 0;
    });

    it("passes for a well-configured repo", () => {
        const dir = makeTmpDir();
        setupValidRepo(dir);

        expect(() => validateRepository(dir, join(dir, REFERENCE_DIR))).not.toThrow();
    });

    it("throws for missing script", () => {
        const dir = makeTmpDir();
        setupValidRepo(dir);
        const pkg = { ...validPkg, scripts: { ...validPkg.scripts } };
        delete (pkg.scripts as Record<string, string>)["format-fix"];
        writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));

        expect(() => validateRepository(dir, join(dir, REFERENCE_DIR))).toThrow(/Missing script `format-fix`/);
    });

    it("throws for missing binary", () => {
        const dir = makeTmpDir();
        setupValidRepo(dir);
        const pkg = { ...validPkg, devDependencies: {} };
        writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));

        expect(() => validateRepository(dir, join(dir, REFERENCE_DIR))).toThrow(/Missing binary `agent-browser`/);
    });

    it("throws when package.json is missing", () => {
        const dir = makeTmpDir();

        expect(() => validateRepository(dir, join(dir, REFERENCE_DIR))).toThrow(/Cannot read/);
    });

    it("error message lists all required scripts", () => {
        const dir = makeTmpDir();
        setupValidRepo(dir);
        const pkg = { scripts: {}, devDependencies: validPkg.devDependencies };
        writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));

        expect(() => validateRepository(dir, join(dir, REFERENCE_DIR))).toThrow(/build, lint, test, typecheck/);
    });

    it("throws when reference docs directory is missing", () => {
        const dir = makeTmpDir();
        writeFileSync(join(dir, "package.json"), JSON.stringify(validPkg));

        expect(() => validateRepository(dir, join(dir, REFERENCE_DIR))).toThrow(/Reference docs directory not found/);
    });
});
