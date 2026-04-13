/**
 * If plan-gate-revision.md exists, verify that it references at least
 * one slice -- a revision without concrete evidence is not actionable.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { hasFile, resolveRunDir } from "../utils.ts";

const SLICE_REF_RE = /slice\s+\d+/i;

export function revisionSliceRefsCheck(cwd: string): string[] {
    if (!hasFile(cwd, "plan-gate-revision.md")) {
        return [];
    }

    const content = readFileSync(resolve(resolveRunDir(cwd), "plan-gate-revision.md"), "utf8");

    if (SLICE_REF_RE.test(content)) {
        return [];
    }

    return [
        'Revision lacks slice references: `.adlc/plan-gate-revision.md` should cite at least one slice (e.g., "Slice 01") in the Evidence section so the planner knows what to fix.'
    ];
}
