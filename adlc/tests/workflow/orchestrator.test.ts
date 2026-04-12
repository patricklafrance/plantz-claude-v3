import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { cleanAdlcState } from "../../src/workflow/orchestrator.js";

function createTempAdlc(base: string) {
    const adlcRoot = resolve(base, ".adlc");
    mkdirSync(resolve(adlcRoot, "slices"), { recursive: true });
    mkdirSync(resolve(adlcRoot, "implementation-notes"), { recursive: true });
    mkdirSync(resolve(adlcRoot, "verification-results"), { recursive: true });

    return adlcRoot;
}

// Use the test file's directory as a throwaway workspace.
// afterEach removes what cleanAdlcState doesn't.
const TEST_BASE = resolve(import.meta.dirname, ".adlc-orchestrator-test");

afterEach(() => {
    rmSync(TEST_BASE, { recursive: true, force: true });
});

describe("cleanAdlcState", () => {
    it("removes known state files", () => {
        const adlcRoot = createTempAdlc(TEST_BASE);

        const staleFiles = [
            "domain-mapping.md",
            "plan-header.md",
            "current-challenge-verdict.md",
            "current-evidence-findings.md",
            "current-explorer-summary.md",
            "placement-gate-revision.md",
            "plan-gate-revision.md",
            "allow-install",
            "metrics-dir",
            "current-slice.md"
        ];

        for (const name of staleFiles) {
            writeFileSync(resolve(adlcRoot, name), "stale content");
        }

        cleanAdlcState(adlcRoot);

        for (const name of staleFiles) {
            // eslint-disable-next-line vitest/valid-expect -- custom failure message
            expect(existsSync(resolve(adlcRoot, name)), `${name} should be removed`).toBe(false);
        }
    });

    it("clears contents of slices/, implementation-notes/, verification-results/", () => {
        const adlcRoot = createTempAdlc(TEST_BASE);

        writeFileSync(resolve(adlcRoot, "slices", "01-old.md"), "old slice");
        writeFileSync(resolve(adlcRoot, "slices", "02-old.md"), "old slice");
        writeFileSync(resolve(adlcRoot, "implementation-notes", "note.md"), "old note");
        writeFileSync(resolve(adlcRoot, "verification-results", "result.md"), "old result");

        cleanAdlcState(adlcRoot);

        // Directories still exist but are empty.
        expect(existsSync(resolve(adlcRoot, "slices"))).toBe(true);
        expect(existsSync(resolve(adlcRoot, "slices", "01-old.md"))).toBe(false);
        expect(existsSync(resolve(adlcRoot, "slices", "02-old.md"))).toBe(false);
        expect(existsSync(resolve(adlcRoot, "implementation-notes", "note.md"))).toBe(false);
        expect(existsSync(resolve(adlcRoot, "verification-results", "result.md"))).toBe(false);
    });

    it("leaves unknown files intact", () => {
        const adlcRoot = createTempAdlc(TEST_BASE);

        writeFileSync(resolve(adlcRoot, "custom-user-file.txt"), "user data");

        cleanAdlcState(adlcRoot);

        expect(readFileSync(resolve(adlcRoot, "custom-user-file.txt"), "utf8")).toBe("user data");
    });

    it("is a no-op when .adlc/ does not exist", () => {
        expect(() => cleanAdlcState(resolve(TEST_BASE, ".adlc"))).not.toThrow();
    });

    it("handles missing subdirectories gracefully", () => {
        const adlcRoot = resolve(TEST_BASE, ".adlc");
        mkdirSync(adlcRoot, { recursive: true });
        writeFileSync(resolve(adlcRoot, "domain-mapping.md"), "content");

        // slices/, implementation-notes/, verification-results/ don't exist.
        cleanAdlcState(adlcRoot);

        expect(existsSync(resolve(adlcRoot, "domain-mapping.md"))).toBe(false);
    });
});
