/**
 * document handler
 *
 * Post-completion pipeline:
 *   1 -- format-fix → lint-fix (sequential)
 */

import { formatFix } from "../format-fix.ts";
import { lintFix } from "../lint-fix.ts";

export async function handleDocument(cwd: string): Promise<string[]> {
    const formatProblems = await formatFix(cwd);
    const lintFixProblems = await lintFix(cwd);

    return [...formatProblems, ...lintFixProblems];
}
