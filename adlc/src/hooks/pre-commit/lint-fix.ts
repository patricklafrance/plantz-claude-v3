/** Auto-fix lint errors (writes in place) and stage changes. Must run after format-fix, before lint check. */

import { run } from "../post-agent-validation/utils.ts";

export async function lintFix(cwd: string): Promise<string[]> {
    const result = await run(cwd, "pnpm lint-fix");

    if (!result.ok) {
        return [`[lint-fix] Lint autofix failed:\n${result.stderr || result.stdout}`];
    }

    // Stage lint-fix changes so they're included in the commit.
    const stage = await run(cwd, "git add -u");
    if (!stage.ok) {
        return [`[lint-fix] Failed to stage fixed files:\n${stage.stderr || stage.stdout}`];
    }

    return [];
}
