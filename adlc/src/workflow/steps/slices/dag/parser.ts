import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { SliceNode } from "./types.ts";

const SLICE_FILENAME_RE = /^slice-(\d+)-(.+)\.md$/;
const DEPENDS_ON_RE = /^>\s*\*\*Depends on:\*\*\s*(.+)$/m;
const SLICE_NUMBER_RE = /Slice\s+(\d+)/gi;

/**
 * Parse slice `.md` files from a directory and extract dependency metadata.
 *
 * Each slice file may contain a line like:
 * ```
 * > **Depends on:** Slice 1, Slice 3
 * ```
 */
export function parseSliceDependencies(slicesDir: string): SliceNode[] {
    const files = readdirSync(slicesDir)
        .filter(f => SLICE_FILENAME_RE.test(f))
        .toSorted();

    return files.map(filename => {
        const match = SLICE_FILENAME_RE.exec(filename);
        if (!match) {
            throw new Error(`Unexpected filename format: ${filename}`);
        }

        const number = parseInt(match[1], 10);
        const name = match[2];

        const content = readFileSync(join(slicesDir, filename), "utf-8");
        const dependsOn = parseDependsOnLine(content);

        return { filename, number, name, dependsOn };
    });
}

function parseDependsOnLine(content: string): number[] {
    const lineMatch = DEPENDS_ON_RE.exec(content);
    if (!lineMatch) {
        return [];
    }

    const deps: number[] = [];
    let m: RegExpExecArray | null;

    // Reset lastIndex for the global regex
    SLICE_NUMBER_RE.lastIndex = 0;
    while ((m = SLICE_NUMBER_RE.exec(lineMatch[1])) !== null) {
        deps.push(parseInt(m[1], 10));
    }

    return deps;
}
