/**
 * reviewer handler
 *
 * Post-completion pipeline:
 *   1 -- verification-results.md exists
 *   2 -- every acceptance criterion from the slice appears in Passed or Failed
 */

import { criteriaCoverageCheck } from "./criteria-coverage-check.ts";
import { resultsFileCheck } from "./verification-results-check.ts";

export function handleReviewer(cwd: string): string[] {
    const problems = resultsFileCheck(cwd);

    // No results file -> coverage check is meaningless
    if (problems.length > 0) {
        return problems;
    }

    problems.push(...criteriaCoverageCheck(cwd));

    return problems;
}
