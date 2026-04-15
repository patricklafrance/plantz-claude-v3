/** Auto-fix lint errors (writes in place) and stage changes. Must run after format-fix, before lint check. */

import { run } from "../post-agent-validation/utils.ts";

export async function lintFix(cwd: string): Promise<string[]> {
    const result = await run(cwd, "pnpm lint-fix");

    if (!result.ok) {
        return [`[lint-fix] Lint autofix failed:\n${result.stderr || result.stdout}`];
    }

    // Re-stage every file already in the index so lint-fix changes are included.
    // "git add -u" only touches tracked files, which silently drops newly-added (A) files.
    const stage = await run(cwd, "git diff --cached --name-only -z | xargs -0 git add --");
    if (!stage.ok) {
        return [`[lint-fix] Failed to stage fixed files:\n${stage.stderr || stage.stdout}`];
    }

    return [];
}
