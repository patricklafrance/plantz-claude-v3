/**
 * Verify that every acceptance criterion from the slice appears in
 * the verification results (either Passed or Failed).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// -- Parsers -------------------------------------------------------------

/**
 * Extract acceptance criteria text from a slice file.
 * Matches unchecked checkboxes: `- [ ] {text}`
 */
function parseSliceCriteria(content: string): string[] {
    const criteria: string[] = [];

    for (const line of content.split("\n")) {
        const match = line.match(/^[-*]\s*\[[ ]\]\s+(.+)$/);
        if (match) {
            criteria.push(normalize(match[1]));
        }
    }

    return criteria;
}

/**
 * Extract criteria text from verification-results.md.
 * Matches both checked `- [x]` and unchecked `- [ ]` checkboxes.
 * Failed entries may have ` -- {reason}` appended -- strip it.
 */
function parseResultsCriteria(content: string): string[] {
    const criteria: string[] = [];

    for (const line of content.split("\n")) {
        const match = line.match(/^[-*]\s*\[[x ]\]\s+(.+)$/i);
        if (match) {
            // Strip failure reason after ` — ` or ` - `
            const text = match[1].replace(/\s+[—–]\s+.+$/, "");
            criteria.push(normalize(text));
        }
    }

    return criteria;
}

/** Lowercase, collapse whitespace, trim -- just enough for fuzzy matching. */
function normalize(text: string): string {
    return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// -- Check ---------------------------------------------------------------

export function criteriaCoverageCheck(cwd: string): string[] {
    const resultsPath = resolve(cwd, ".adlc", "verification-results.md");

    let resultsContent: string;
    try {
        resultsContent = readFileSync(resultsPath, "utf8");
    } catch {
        // File doesn't exist -- results-file check handles this
        return [];
    }

    let sliceContent: string;
    try {
        sliceContent = readFileSync(resolve(cwd, ".adlc", "current-slice.md"), "utf8");
    } catch {
        // No current-slice.md -- skip the coverage check
        return [];
    }

    const expected = parseSliceCriteria(sliceContent);
    const reported = parseResultsCriteria(resultsContent);

    const missing = expected.filter(criterion => !reported.some(r => r.includes(criterion) || criterion.includes(r)));

    if (missing.length === 0) {
        return [];
    }

    return [
        [
            `Incomplete verification: ${missing.length} acceptance criteria from the slice are not in verification-results.md.`,
            "",
            "Missing:",
            ...missing.map(c => `  - ${c}`)
        ].join("\n")
    ];
}
