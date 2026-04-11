/**
 * simplify handler
 *
 * Post-completion pipeline:
 *   1 -- format-fix → lint-fix (sequential, must complete before checks)
 *   2 -- build, lint, tests, file-disable scan, import guard (parallel)
 */

import { buildCheck } from "../build-check.js";
import { formatFix } from "../format-fix.js";
import { crossBoundaryImportsCheck } from "../import-check.js";
import { lintCheck } from "../lint-check.js";
import { lintFix } from "../lint-fix.js";
import { noFileDisableCheck } from "../no-file-disable-check.js";
import { testsCheck } from "../tests-check.js";
import { getChangedFiles } from "../utils.js";

export async function handleSimplify(cwd: string): Promise<string[]> {
    const changedFiles = getChangedFiles(cwd);

    // Phase 1: autofix — format first, then lint-fix (sequential to avoid conflicts)
    const formatProblems = await formatFix(cwd);
    const lintFixProblems = await lintFix(cwd);

    // Phase 2: everything else in parallel
    const results = await Promise.all([
        buildCheck(cwd),
        lintCheck(cwd),
        testsCheck(cwd),
        Promise.resolve(noFileDisableCheck(cwd, changedFiles)),
        Promise.resolve(crossBoundaryImportsCheck(cwd, changedFiles))
    ]);

    return [...formatProblems, ...lintFixProblems, ...results.flat()];
}
