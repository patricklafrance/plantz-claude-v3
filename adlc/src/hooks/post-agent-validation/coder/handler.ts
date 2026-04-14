/**
 * coder handler
 *
 * Post-completion pipeline:
 *   1 -- format-fix → lint-fix (sequential, must complete before checks)
 *   2 -- build, lint, tests, file-disable scan, secret scan, import guard,
 *       implementation-notes check, story coverage, context refresh (parallel)
 *   3 -- kill dev server ports (always)
 */

import { buildCheck } from "../build-check.ts";
import { formatFix } from "../format-fix.ts";
import { crossBoundaryImportsCheck } from "../import-check.ts";
import { lintCheck } from "../lint-check.ts";
import { lintFix } from "../lint-fix.ts";
import { noFileDisableCheck } from "../no-file-disable-check.ts";
import { testsCheck } from "../tests-check.ts";
import { getChangedFiles } from "../utils.ts";
import { contextRefreshCheck } from "./context-refresh.ts";
import { implementationNotesCheck } from "./implementation-notes-check.ts";
import { killDevServers } from "./kill-dev-servers.ts";
import { noSecretsCheck } from "./no-secrets-check.ts";
import { storyCoverageCheck } from "./story-coverage-check.ts";

export async function handleCoder(cwd: string, markers: Record<string, boolean>): Promise<string[]> {
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
        noSecretsCheck(cwd, changedFiles),
        Promise.resolve(crossBoundaryImportsCheck(cwd, changedFiles)),
        Promise.resolve(implementationNotesCheck(changedFiles)),
        Promise.resolve(storyCoverageCheck(cwd, changedFiles)),
        Promise.resolve(contextRefreshCheck(cwd, markers))
    ]);

    // Phase 3: kill dev servers by process pattern (not port — ports are dynamic)
    killDevServers(cwd);

    return [...formatProblems, ...lintFixProblems, ...results.flat()];
}
