import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { parseSliceDependencies } from "../../../../../src/workflow/steps/slices/dag/parser.js";

describe("parseSliceDependencies", () => {
    let slicesDir: string;

    beforeEach(() => {
        slicesDir = mkdtempSync(join(tmpdir(), "dag-parser-"));
    });

    afterEach(() => {
        rmSync(slicesDir, { recursive: true, force: true });
    });

    it("parses a slice with no dependencies", () => {
        writeFileSync(join(slicesDir, "slice-01-plant-list.md"), "# Slice 1 — Plant List\n\nBuild the plant list component.\n");

        const nodes = parseSliceDependencies(slicesDir);

        expect(nodes).toHaveLength(1);
        expect(nodes[0]).toEqual({
            filename: "slice-01-plant-list.md",
            number: 1,
            name: "plant-list",
            dependsOn: []
        });
    });

    it("parses a slice with dependencies", () => {
        writeFileSync(
            join(slicesDir, "slice-04-care-schedule.md"),
            ["# Slice 4 — Care Schedule", "", "> **Depends on:** Slice 1, Slice 3", "", "Implement the care schedule feature."].join("\n")
        );

        const nodes = parseSliceDependencies(slicesDir);

        expect(nodes).toHaveLength(1);
        expect(nodes[0]).toEqual({
            filename: "slice-04-care-schedule.md",
            number: 4,
            name: "care-schedule",
            dependsOn: [1, 3]
        });
    });

    it("parses multiple slices with mixed dependencies", () => {
        writeFileSync(join(slicesDir, "slice-01-shared-types.md"), "# Slice 1 — Shared Types\n\nDefine shared types.\n");
        writeFileSync(join(slicesDir, "slice-02-api-client.md"), "# Slice 2 — API Client\n\n> **Depends on:** Slice 1\n\nBuild the API client.\n");
        writeFileSync(
            join(slicesDir, "slice-03-ui-components.md"),
            "# Slice 3 — UI Components\n\n> **Depends on:** Slice 1\n\nBuild UI components.\n"
        );
        writeFileSync(
            join(slicesDir, "slice-04-integration.md"),
            "# Slice 4 — Integration\n\n> **Depends on:** Slice 2, Slice 3\n\nIntegrate everything.\n"
        );

        const nodes = parseSliceDependencies(slicesDir);

        expect(nodes).toHaveLength(4);
        expect(nodes.map(n => n.number)).toEqual([1, 2, 3, 4]);
        expect(nodes.map(n => n.name)).toEqual(["shared-types", "api-client", "ui-components", "integration"]);

        expect(nodes[0].dependsOn).toEqual([]);
        expect(nodes[1].dependsOn).toEqual([1]);
        expect(nodes[2].dependsOn).toEqual([1]);
        expect(nodes[3].dependsOn).toEqual([2, 3]);
    });

    it("extracts slice numbers and names correctly from various filenames", () => {
        writeFileSync(join(slicesDir, "slice-10-long-kebab-case-name.md"), "# Slice 10\n\nSome content.\n");

        const nodes = parseSliceDependencies(slicesDir);

        expect(nodes[0].number).toBe(10);
        expect(nodes[0].name).toBe("long-kebab-case-name");
        expect(nodes[0].filename).toBe("slice-10-long-kebab-case-name.md");
    });

    it("ignores non-slice files in the directory", () => {
        writeFileSync(join(slicesDir, "README.md"), "# README\n");
        writeFileSync(join(slicesDir, "plan.md"), "# Plan\n");
        writeFileSync(join(slicesDir, "slice-01-feature.md"), "# Slice 1\n\nContent.\n");

        const nodes = parseSliceDependencies(slicesDir);

        expect(nodes).toHaveLength(1);
        expect(nodes[0].filename).toBe("slice-01-feature.md");
    });

    it("returns empty array for an empty directory", () => {
        const nodes = parseSliceDependencies(slicesDir);
        expect(nodes).toEqual([]);
    });
});
