/**
 * One-shot context refresh -- blocks the coder once per slice with a concise
 * checklist of concerns that are easy to forget by stop time.
 *
 * By the time SubagentStop fires, the original skill instructions are buried
 * under thousands of tokens. This hook forces a pause that gets full
 * recency-bias attention.
 *
 * Uses `.adlc/markers.json` keyed by slice name so the checklist is only
 * shown once per slice (preventing infinite block loops).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const MARKERS_FILE = "markers.json";
const MARKER_KEY_PREFIX = "context-refresh:";

// -- Slice key -----------------------------------------------------------

/**
 * Extract the `id` field from YAML frontmatter.
 * e.g. "---\nid: slice-1\n---\n# Slice 1: Plant List" -> "slice-1"
 */
export function extractSliceId(content: string): string | null {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
        return null;
    }

    const idMatch = fmMatch[1].match(/^id:\s*(.+)$/m);

    return idMatch ? idMatch[1].trim() : null;
}

// -- Markers -------------------------------------------------------------

function readMarkers(cwd: string): Record<string, boolean> {
    const markersPath = resolve(cwd, ".adlc", MARKERS_FILE);
    try {
        return JSON.parse(readFileSync(markersPath, "utf8"));
    } catch {
        return {};
    }
}

function writeMarker(cwd: string, key: string): void {
    const markersPath = resolve(cwd, ".adlc", MARKERS_FILE);
    const markers = readMarkers(cwd);
    markers[key] = true;
    writeFileSync(markersPath, JSON.stringify(markers, null, 4) + "\n");
}

// -- Check ---------------------------------------------------------------

const CONTEXT_REFRESH_MESSAGE = [
    "[context-refresh] Before completing this slice, review these easy-to-forget concerns:",
    "",
    "1. **MSW handlers** — If you added or changed data-fetching code, are the matching MSW handlers in the module's `src/mocks/` created or updated?",
    "2. **Story variants** — Do your `.stories.tsx` files cover the meaningful states (loading, empty, error, populated)? Are MSW handlers wired via `parameters.msw.handlers`?",
    "3. **Implementation notes** — Does your `.adlc/implementation-notes/` file capture any non-obvious decisions, workarounds, or deviations from the slice plan?",
    "",
    "Fix anything missing before stopping."
].join("\n");

export function contextRefreshCheck(cwd: string): string[] {
    const slicePath = resolve(cwd, ".adlc", "current-slice.md");

    if (!existsSync(slicePath)) {
        return [];
    }

    let sliceContent: string;
    try {
        sliceContent = readFileSync(slicePath, "utf8");
    } catch {
        return [];
    }

    const sliceKey = extractSliceId(sliceContent);
    if (!sliceKey) {
        return [];
    }

    const markerKey = `${MARKER_KEY_PREFIX}${sliceKey}`;
    const markers = readMarkers(cwd);

    if (markers[markerKey]) {
        return [];
    }

    // First stop for this slice -- write marker and block.
    writeMarker(cwd, markerKey);

    return [CONTEXT_REFRESH_MESSAGE];
}
