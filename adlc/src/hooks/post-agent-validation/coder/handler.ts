/**
 * coder handler
 *
 * Post-completion pipeline:
 *   1 -- format-fix → lint-fix (sequential, must complete before checks)
 *   2 -- build, lint, tests, file-disable scan, secret scan, import guard,
 *       implementation-notes check, story coverage, context refresh (parallel)
 *   3 -- kill dev server ports (always)
 */

import { loadConfig, resolveConfig } from "../../../config.js";
import { buildCheck } from "../build-check.js";
import { formatFix } from "../format-fix.js";
import { crossBoundaryImportsCheck } from "../import-check.js";
import { lintCheck } from "../lint-check.js";
import { lintFix } from "../lint-fix.js";
import { noFileDisableCheck } from "../no-file-disable-check.js";
import { testsCheck } from "../tests-check.js";
import { getChangedFiles } from "../utils.js";
import { contextRefreshCheck } from "./context-refresh.js";
import { implementationNotesCheck } from "./implementation-notes-check.js";
import { killPorts } from "./kill-ports.js";
import { noSecretsCheck } from "./no-secrets-check.js";
import { storyCoverageCheck } from "./story-coverage-check.js";

export async function handleCoder(cwd: string): Promise<string[]> {
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
        Promise.resolve(contextRefreshCheck(cwd))
    ]);

    // Phase 3: kill dev server ports from config
    const config = resolveConfig(await loadConfig(cwd));
    const portsToKill = Object.values(config.ports).filter((p): p is number => p !== undefined);
    killPorts(portsToKill);

    return [...formatProblems, ...lintFixProblems, ...results.flat()];
}
