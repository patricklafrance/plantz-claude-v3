/** Verify that at least one slice file exists in .adlc/slices/. */

import { listFiles } from "../utils.ts";

export function sliceFilesCheck(cwd: string): string[] {
    const files = listFiles(cwd, "slices", ".md");

    if (files.length > 0) {
        return [];
    }

    return ["Missing deliverable: no slice files in `.adlc/slices/` — the planner must produce at least one `NN-{title}.md` slice."];
}
