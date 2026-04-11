/** Auto-format (writes in place). Must run before lint. */

import { run } from "./utils.ts";

export async function formatFix(cwd: string): Promise<string[]> {
    let result = await run(cwd, "pnpm format-fix");

    // oxfmt has a transient race condition in its CSS import resolver that
    // surfaces as: TypeError: Cannot use 'in' operator to search for 'importer'
    // A single retry is enough to clear it.
    if (!result.ok && /Cannot use 'in' operator/.test(result.stderr || result.stdout)) {
        result = await run(cwd, "pnpm format-fix");
    }

    if (!result.ok) {
        return [`[format] Auto-format failed:\n${result.stderr || result.stdout}`];
    }
    return [];
}
