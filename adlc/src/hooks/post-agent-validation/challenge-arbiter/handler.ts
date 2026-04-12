/**
 * challenge-arbiter handler
 *
 * Checks:
 *   1. current-challenge-verdict.md exists in .adlc/
 *   2. verdict contains a ## Status section with "Approved" or "Revision required"
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { hasFile } from "../utils.ts";

const VERDICT_FILE = "current-challenge-verdict.md";

function statusCheck(cwd: string): string[] {
    let content: string;
    try {
        content = readFileSync(resolve(cwd, ".adlc", VERDICT_FILE), "utf-8");
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

export function handleChallengeArbiter(cwd: string): string[] {
    if (!hasFile(cwd, VERDICT_FILE)) {
        return [
            "Missing deliverable: `.adlc/current-challenge-verdict.md` was not created. The arbiter must synthesize the challenger debate into a unified verdict."
        ];
    }

    return statusCheck(cwd);
}
