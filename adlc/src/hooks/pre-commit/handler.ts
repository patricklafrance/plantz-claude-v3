/**
 * Pre-commit handler
 *
 * Pipeline:
 *   1 — format-fix → lint-fix → stage changes (sequential, must complete before checks)
 *   2 — build, lint, tests, gitignore-check (parallel)
 */

import { buildCheck } from "./build-check.js";
import { formatFix } from "./format-fix.js";
import { gitignoreCheck } from "./gitignore-check.js";
import { lintCheck } from "./lint-check.js";
import { lintFix } from "./lint-fix.js";
import { testsCheck } from "./tests-check.js";

export async function handlePreCommit(cwd: string): Promise<string[]> {
    // Phase 1: autofix — format first, then lint-fix (sequential to avoid conflicts)
    const formatProblems = await formatFix(cwd);
    const lintFixProblems = await lintFix(cwd);

    // Phase 2: build + lint (check-only, catches unfixable issues) + tests + gitignore-check in parallel
    const results = await Promise.all([buildCheck(cwd), lintCheck(cwd), testsCheck(cwd), gitignoreCheck(cwd)]);

    return [...formatProblems, ...lintFixProblems, ...results.flat()];
}
