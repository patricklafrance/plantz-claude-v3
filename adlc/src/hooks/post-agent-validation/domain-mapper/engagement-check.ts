/**
 * Engagement verification -- checks that the mapper actually engaged with
 * the challenge verdict in its challenge-revision, rather than dismissing
 * concerns without evidence.
 *
 * For each concern in the verdict with confidence >= medium:
 *   1. The Challenge Resolution section must exist in domain-mapping.md.
 *   2. The concern must appear in that section.
 *
 * Returns problems (string[]) -- empty if no verdict exists or all are engaged.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { resolveRunDir } from "../utils.ts";

interface Concern {
    name: string;
    confidence: string;
}

export function engagementCheck(cwd: string): string[] {
    const adlc = resolveRunDir(cwd);

    // Parse the unified verdict
    const concerns = parseVerdict(adlc);

    // No verdict or no concerns -> nothing to check
    if (concerns.length === 0) {
        return [];
    }

    // Filter to medium+ confidence
    const actionable = concerns.filter(c => c.confidence !== "low");
    if (actionable.length === 0) {
        return [];
    }

    // Read the mapping to check for Challenge Resolution section
    let mapping: string;
    try {
        mapping = readFileSync(resolve(adlc, "domain-mapping.md"), "utf8");
    } catch {
        return ["Engagement check: cannot read .adlc/domain-mapping.md"];
    }

    const resolutionSection = extractSection(mapping, "Challenge Resolution");
    if (!resolutionSection) {
        return [
            `Engagement check failed: ${actionable.length} concern(s) with medium+ confidence exist, ` +
                "but .adlc/domain-mapping.md has no ## Challenge Resolution section. " +
                "The mapper must address each concern with artifact-level evidence."
        ];
    }

    const problems: string[] = [];

    for (const concern of actionable) {
        if (!resolutionSection.includes(concern.name)) {
            problems.push(
                `Engagement check: verdict concern "${concern.name}" (${concern.confidence} confidence) ` +
                    "has no entry in the Challenge Resolution section."
            );
        }
    }

    return problems;
}

/**
 * Parse the challenge verdict's Summary table to extract concern names and
 * confidence levels. Returns [{ name, confidence }].
 *
 * Expected table format:
 *   | Concern | Sprawl position | Cohesion position | Verdict | Confidence |
 *   | name    | ...             | ...               | ...     | high       |
 */
function parseVerdict(adlcDir: string): Concern[] {
    let content: string;
    try {
        content = readFileSync(resolve(adlcDir, "current-challenge-verdict.md"), "utf8");
    } catch {
        return [];
    }

    const concerns: Concern[] = [];
    // Match table rows: | concern | ... | ... | ... | confidence |
    const rowRe = /^\|\s*([^|]+?)\s*\|[^|]*\|[^|]*\|[^|]*\|\s*(\w+)\s*\|$/gm;
    let match: RegExpExecArray | null;

    while ((match = rowRe.exec(content)) !== null) {
        const name = match[1].trim();
        const confidence = match[2].trim().toLowerCase();
        // Skip header row and separator
        if (name === "Concern" || name.startsWith("-")) {
            continue;
        }
        concerns.push({ name, confidence });
    }

    return concerns;
}

function extractSection(md: string, heading: string): string | null {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|\\n)##\\s+${escaped}\\b[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`);
    const match = md.match(re);
    return match ? match[1].trim() || null : null;
}
