/**
 * challenge-arbiter handler
 *
 * Checks:
 *   1. current-challenge-verdict.md exists in .adlc/
 *   2. verdict contains a ## Status section with "Approved" or "Revision required"
 *   3. verdict actually processed challenger analyses (not a rubber-stamp)
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { hasFile, resolveRunDir } from "../utils.ts";

const VERDICT_FILE = "current-challenge-verdict.md";
const MAPPING_FILE = "domain-mapping.md";

function statusCheck(cwd: string): string[] {
    let content: string;
    try {
        content = readFileSync(resolve(resolveRunDir(cwd), VERDICT_FILE), "utf-8");
    } catch {
        return []; // file-existence check already covers this
    }

    const statusMatch = content.match(/^##\s+Status\s*\n+(.+)/im);
    if (!statusMatch) {
        return ["Missing `## Status` section in verdict. The verdict must end with `## Status` followed by **Approved** or **Revision required**."];
    }

    const status = statusMatch[1].trim().toLowerCase();
    if (status.startsWith("approved") || status.startsWith("revision required")) {
        return [];
    }

    return [`Invalid status "${statusMatch[1].trim()}" in verdict. Must be **Approved** or **Revision required** (followed by a one-line summary).`];
}

/**
 * Detect rubber-stamp verdicts: if the domain mapping has "create" decisions
 * but the verdict says "no challenge submitted" for every one of them,
 * the arbiter likely didn't process the challenger analyses.
 */
function rubberStampCheck(cwd: string): string[] {
    const runDir = resolveRunDir(cwd);

    let mapping: string;
    try {
        mapping = readFileSync(resolve(runDir, MAPPING_FILE), "utf-8");
    } catch {
        return []; // no mapping file — nothing to check against
    }

    // Check if any create decisions exist in the mapping
    const hasCreateDecisions = /\bcreate\b/i.test(mapping);
    if (!hasCreateDecisions) {
        return [];
    }

    let verdict: string;
    try {
        verdict = readFileSync(resolve(runDir, VERDICT_FILE), "utf-8");
    } catch {
        return [];
    }

    // If the verdict mentions "no challenge" for every summary row and create decisions exist,
    // the arbiter rubber-stamped without processing challenger input.
    const summaryRows = verdict.match(/^\|.*\|$/gm) ?? [];
    const dataRows = summaryRows.filter(r => !r.includes("---") && !r.includes("Concern"));
    if (dataRows.length === 0) {
        return [];
    }

    const allUncontested = dataRows.every(row => /no challenge/i.test(row));
    if (allUncontested) {
        return [
            "Rubber-stamp verdict detected: the domain mapping has `create` decisions but the verdict lists every concern as \"no challenge.\" " +
            "Read `challenges/sprawl-challenge.md` and `challenges/cohesion-challenge.md` — the challengers wrote their analyses there. " +
            "Rewrite the verdict incorporating the challenger arguments."
        ];
    }

    return [];
}

export function handleChallengeArbiter(cwd: string): string[] {
    if (!hasFile(cwd, VERDICT_FILE)) {
        return [
            "Missing deliverable: `.adlc/current-challenge-verdict.md` was not created. The arbiter must synthesize the challenger debate into a unified verdict."
        ];
    }

    return [...statusCheck(cwd), ...rubberStampCheck(cwd)];
}
