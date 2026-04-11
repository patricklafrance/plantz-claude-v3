/**
 * Pre-commit handler
 *
 * Pipeline:
 *   1 — format-fix → lint-fix → stage changes (sequential, must complete before checks)
 *   2 — build, lint, tests, gitignore-check (parallel)
 */

import { buildCheck } from "./build-check.ts";
import { formatFix } from "./format-fix.ts";
import { gitignoreCheck } from "./gitignore-check.ts";
import { lintCheck } from "./lint-check.ts";
import { lintFix } from "./lint-fix.ts";
import { testsCheck } from "./tests-check.ts";

export async function handlePreCommit(cwd: string): Promise<string[]> {
    // Phase 1: autofix — format first, then lint-fix (sequential to avoid conflicts)
    const formatProblems = await formatFix(cwd);
    const lintFixProblems = await lintFix(cwd);

    // Phase 2: build + lint (check-only, catches unfixable issues) + tests + gitignore-check in parallel
    const results = await Promise.all([buildCheck(cwd), lintCheck(cwd), testsCheck(cwd), gitignoreCheck(cwd)]);

    return [...formatProblems, ...lintFixProblems, ...results.flat()];
}
