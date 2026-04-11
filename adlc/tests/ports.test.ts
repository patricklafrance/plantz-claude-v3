import { describe, expect, it } from "vitest";

import { allocatePorts } from "../src/ports.js";

const BASE = { storybook: 6100, hostApp: 8100, browser: 9200 };

describe("utils/ports", () => {
    it("returns base ports for index 0", () => {
        const ports = allocatePorts(0, BASE);

        expect(ports.storybook).toBe(6100);
        expect(ports.hostApp).toBe(8100);
        expect(ports.browser).toBe(9200);
    });

    it("offsets ports by the given index", () => {
        const ports = allocatePorts(3, BASE);

        expect(ports.storybook).toBe(6103);
        expect(ports.hostApp).toBe(8103);
        expect(ports.browser).toBe(9203);
    });

    it("allocates non-overlapping ports for consecutive indices", () => {
        const allPorts: number[] = [];

        for (let i = 0; i < 5; i++) {
            const ports = allocatePorts(i, BASE);
            allPorts.push(ports.storybook, ports.hostApp, ports.browser);
        }

        const unique = new Set(allPorts);
        expect(unique.size).toBe(allPorts.length);
    });

    it("uses custom port base", () => {
        const custom = { storybook: 7000, hostApp: 7100, browser: 7200 };
        const ports = allocatePorts(1, custom);

        expect(ports.storybook).toBe(7001);
        expect(ports.hostApp).toBe(7101);
        expect(ports.browser).toBe(7201);
    });
});
