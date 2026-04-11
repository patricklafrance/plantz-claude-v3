import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, afterEach } from "vitest";

import { defineConfig, loadConfig, resolveConfig } from "../src/config.js";
import type { AdlcConfig } from "../src/config.js";

// ── defineConfig ─────────────────────────────────────────

describe("defineConfig", () => {
    it("returns the config object unchanged (identity helper)", () => {
        const input: AdlcConfig = { ports: { storybook: 6006 } };
        expect(defineConfig(input)).toBe(input);
    });

    it("accepts empty config", () => {
        expect(defineConfig({})).toEqual({});
    });
});

// ── resolveConfig ────────────────────────────────────────

describe("resolveConfig", () => {
    it("fills all defaults from empty config", () => {
        const resolved = resolveConfig({});

        expect(resolved).toEqual({
            structure: {
                apps: "./apps",
                hostApp: "host",
                modules: "./modules",
                packages: "./packages",
                reference: "./agent-docs"
            },
            scaffolding: {
                packageMeta: {
                    license: "Apache-2.0",
                    author: undefined
                },
                referenceModule: undefined,
                referenceStorybook: undefined
            },
            ports: {
                storybook: 6100,
                hostApp: 8100,
                browser: 9200
            },
            agents: {}
        });
    });

    it("preserves partial overrides while filling remaining defaults", () => {
        const resolved = resolveConfig({
            structure: { apps: "./applications", hostApp: "web" },
            ports: { storybook: 6006 }
        });

        expect(resolved.structure.apps).toBe("./applications");
        expect(resolved.structure.hostApp).toBe("web");
        expect(resolved.structure.modules).toBe("./modules");
        expect(resolved.structure.packages).toBe("./packages");
        expect(resolved.structure.reference).toBe("./agent-docs");
        expect(resolved.ports.storybook).toBe(6006);
        expect(resolved.ports.hostApp).toBe(8100);
    });

    it("preserves full overrides", () => {
        const resolved = resolveConfig({
            structure: {
                apps: "./a",
                hostApp: "h",
                modules: "./m",
                packages: "./p",
                reference: "./r"
            },
            scaffolding: {
                packageMeta: { license: "MIT", author: "Test" },
                referenceModule: "dashboard",
                referenceStorybook: "storybook-dashboard"
            },
            ports: { storybook: 9000, hostApp: 9001 }
        });

        expect(resolved.structure.apps).toBe("./a");
        expect(resolved.structure.hostApp).toBe("h");
        expect(resolved.structure.modules).toBe("./m");
        expect(resolved.structure.packages).toBe("./p");
        expect(resolved.structure.reference).toBe("./r");
        expect(resolved.scaffolding.packageMeta.license).toBe("MIT");
        expect(resolved.scaffolding.packageMeta.author).toBe("Test");
        expect(resolved.scaffolding.referenceModule).toBe("dashboard");
        expect(resolved.scaffolding.referenceStorybook).toBe("storybook-dashboard");
        expect(resolved.ports.storybook).toBe(9000);
        expect(resolved.ports.hostApp).toBe(9001);
    });
});

// ── loadConfig ───────────────────────────────────────────

describe("loadConfig", () => {
    const tmpBase = join(tmpdir(), "adlc-config-test");
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

    it("returns empty config when no config file exists", async () => {
        const dir = makeTmpDir();
        const config = await loadConfig(dir);
        expect(config).toEqual({});
    });

    it("loads adlc.config.mjs with default export", async () => {
        const dir = makeTmpDir();
        writeFileSync(join(dir, "adlc.config.mjs"), `export default { ports: { storybook: 7777 } };`);

        const config = await loadConfig(dir);
        expect(config).toEqual({ ports: { storybook: 7777 } });
    });

    it("returns empty config when module has no default export", async () => {
        const dir = makeTmpDir();
        writeFileSync(join(dir, "adlc.config.mjs"), `export const foo = 42;`);

        const config = await loadConfig(dir);
        expect(config).toEqual({});
    });
});
