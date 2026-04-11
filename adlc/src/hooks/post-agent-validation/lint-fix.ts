/** Auto-fix lint errors (writes in place). Must run after format-fix, before lint check. */

import { run } from "./utils.js";

export async function lintFix(cwd: string): Promise<string[]> {
    const result = await run(cwd, "pnpm lint-fix");

    if (!result.ok) {
        return [`[lint-fix] Lint autofix failed:\n${result.stderr || result.stdout}`];
    }
    return [];
}
