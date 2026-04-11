/** Verify that .adlc/plan-header.md exists and is non-empty. */

import { hasFile } from "../utils.ts";

export function planHeaderCheck(cwd: string): string[] {
    if (hasFile(cwd, "plan-header.md")) {
        return [];
    }

    return ["Missing deliverable: `.adlc/plan-header.md` — the planner must write a plan header before stopping."];
}
