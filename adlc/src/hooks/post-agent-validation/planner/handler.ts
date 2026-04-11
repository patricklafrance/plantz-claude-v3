/**
 * planner handler
 *
 * Checks:
 *   1. plan-header          -- plan-header.md exists
 *   2. slice-files          -- at least one slice file in .adlc/slices/
 *   3. slice-criteria       -- every slice has at least one acceptance criterion
 *   4. slice-ref-packages   -- every slice has a Reference Packages section
 */

import { planHeaderCheck } from "./plan-header-check.ts";
import { sliceCriteriaCheck } from "./slice-criteria-check.ts";
import { sliceFilesCheck } from "./slice-files-check.ts";
import { sliceReferencePackagesCheck } from "./slice-reference-packages-check.ts";

export function handlePlanner(cwd: string): string[] {
    const problems = [...planHeaderCheck(cwd), ...sliceFilesCheck(cwd)];

    // No slices -> per-slice checks are meaningless
    if (problems.some(p => p.includes("no slice files"))) {
        return problems;
    }

    problems.push(...sliceCriteriaCheck(cwd), ...sliceReferencePackagesCheck(cwd));

    return problems;
}
