import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildDAG, scheduleWaves } from "../../../../../src/workflow/steps/slices/dag/scheduler.js";
import type { SliceNode } from "../../../../../src/workflow/steps/slices/dag/types.js";

function makeNode(number: number, name: string, dependsOn: number[] = []): SliceNode {
    return {
        filename: `slice-${String(number).padStart(2, "0")}-${name}.md`,
        number,
        name,
        dependsOn
    };
}

describe("scheduleWaves", () => {
    it("schedules a linear chain into sequential waves", () => {
        const nodes: SliceNode[] = [makeNode(1, "first"), makeNode(2, "second", [1]), makeNode(3, "third", [2])];

        const waves = scheduleWaves(nodes);

        expect(waves).toHaveLength(3);
        expect(waves[0]).toEqual({ index: 0, slices: [nodes[0]] });
        expect(waves[1]).toEqual({ index: 1, slices: [nodes[1]] });
        expect(waves[2]).toEqual({ index: 2, slices: [nodes[2]] });
    });

    it("schedules independent slices into a single wave", () => {
        const nodes: SliceNode[] = [makeNode(1, "alpha"), makeNode(2, "beta"), makeNode(3, "gamma")];

        const waves = scheduleWaves(nodes);

        expect(waves).toHaveLength(1);
        expect(waves[0].slices).toHaveLength(3);
        expect(waves[0].slices.map(s => s.number)).toEqual([1, 2, 3]);
    });

    it("schedules a diamond: 1→{2,3}→4 into 3 waves", () => {
        const nodes: SliceNode[] = [makeNode(1, "base"), makeNode(2, "left", [1]), makeNode(3, "right", [1]), makeNode(4, "top", [2, 3])];

        const waves = scheduleWaves(nodes);

        expect(waves).toHaveLength(3);
        expect(waves[0].slices.map(s => s.number)).toEqual([1]);
        expect(waves[1].slices.map(s => s.number)).toEqual([2, 3]);
        expect(waves[2].slices.map(s => s.number)).toEqual([4]);
    });

    it("detects a cycle and throws", () => {
        const nodes: SliceNode[] = [makeNode(1, "a", [2]), makeNode(2, "b", [1])];

        expect(() => scheduleWaves(nodes)).toThrow(/cycle/i);
    });

    it("throws a clear error for a dangling dependency reference", () => {
        const nodes: SliceNode[] = [makeNode(1, "alpha", [5])];

        expect(() => scheduleWaves(nodes)).toThrow(/Slice 1.*depends on Slice 5.*does not exist/);
    });

    it("schedules the household-feature pattern correctly", () => {
        const nodes: SliceNode[] = [
            makeNode(1, "shared-types"),
            makeNode(2, "api-client", [1]),
            makeNode(3, "ui-components", [1]),
            makeNode(4, "feature-a", [2]),
            makeNode(5, "feature-b", [1]),
            makeNode(6, "integration", [4, 5])
        ];

        const waves = scheduleWaves(nodes);

        expect(waves).toHaveLength(4);
        expect(waves[0].slices.map(s => s.number)).toEqual([1]);
        expect(waves[1].slices.map(s => s.number)).toEqual([2, 3, 5]);
        expect(waves[2].slices.map(s => s.number)).toEqual([4]);
        expect(waves[3].slices.map(s => s.number)).toEqual([6]);
    });

    it("handles a single slice with no dependencies", () => {
        const nodes: SliceNode[] = [makeNode(1, "only")];

        const waves = scheduleWaves(nodes);

        expect(waves).toHaveLength(1);
        expect(waves[0].slices).toEqual([nodes[0]]);
    });
});

describe("buildDAG", () => {
    let slicesDir: string;

    beforeEach(() => {
        slicesDir = mkdtempSync(join(tmpdir(), "dag-build-"));
    });

    afterEach(() => {
        rmSync(slicesDir, { recursive: true, force: true });
    });

    it("builds a complete DAG from slice files on disk", () => {
        writeFileSync(join(slicesDir, "slice-01-base.md"), "# Slice 1 — Base\n\nBase slice.\n");
        writeFileSync(join(slicesDir, "slice-02-feature.md"), "# Slice 2 — Feature\n\n> **Depends on:** Slice 1\n\nFeature slice.\n");
        writeFileSync(join(slicesDir, "slice-03-tests.md"), "# Slice 3 — Tests\n\n> **Depends on:** Slice 1\n\nTest slice.\n");
        writeFileSync(join(slicesDir, "slice-04-integration.md"), "# Slice 4 — Integration\n\n> **Depends on:** Slice 2, Slice 3\n\nIntegration.\n");

        const dag = buildDAG(slicesDir);

        expect(dag.nodes).toHaveLength(4);
        expect(dag.waves).toHaveLength(3);
        expect(dag.waves[0].slices.map(s => s.number)).toEqual([1]);
        expect(dag.waves[1].slices.map(s => s.number)).toEqual([2, 3]);
        expect(dag.waves[2].slices.map(s => s.number)).toEqual([4]);
    });
});
