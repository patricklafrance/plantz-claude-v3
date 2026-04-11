/**
 * challenge-arbiter handler
 *
 * Checks:
 *   1. current-challenge-verdict.md exists in .adlc/
 */

import { hasFile } from "../utils.js";

export function handleChallengeArbiter(cwd: string): string[] {
    if (hasFile(cwd, "current-challenge-verdict.md")) {
        return [];
    }

    return [
        "Missing deliverable: `.adlc/current-challenge-verdict.md` was not created. " +
            "The arbiter must synthesize the challenger debate into a unified verdict."
    ];
}
