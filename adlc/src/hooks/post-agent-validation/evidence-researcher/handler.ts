/**
 * evidence-researcher handler
 *
 * Checks:
 *   1. current-evidence-findings.md exists in .adlc/
 */

import { hasFile } from "../utils.js";

export function handleEvidenceResearcher(cwd: string): string[] {
    if (hasFile(cwd, "current-evidence-findings.md")) {
        return [];
    }

    return [
        "Missing deliverable: `.adlc/current-evidence-findings.md` was not created. " +
            "The evidence researcher must produce findings for each evidence gap."
    ];
}
