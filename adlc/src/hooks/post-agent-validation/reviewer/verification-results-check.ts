/** Verify that .adlc/verification-results.md exists and is non-empty. */

import { hasFile } from "../utils.js";

export function resultsFileCheck(cwd: string): string[] {
    if (hasFile(cwd, "verification-results.md")) {
        return [];
    }

    return ["Missing deliverable: `.adlc/verification-results.md` — the reviewer must write verification results before stopping."];
}
