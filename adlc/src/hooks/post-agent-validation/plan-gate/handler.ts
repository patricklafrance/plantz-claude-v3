/**
 * plan-gate handler
 *
 * Checks:
 *   1. no-plan-mutations  -- plan-gate must not modify plan files
 *   2. revision-slice-refs -- if revision exists, it should reference at least one slice
 */

import { noPlanMutationsCheck } from "./no-plan-mutations-check.ts";
import { revisionSliceRefsCheck } from "./revision-slice-refs-check.ts";

export function handlePlanGate(cwd: string): string[] {
    return [...noPlanMutationsCheck(cwd), ...revisionSliceRefsCheck(cwd)];
}
