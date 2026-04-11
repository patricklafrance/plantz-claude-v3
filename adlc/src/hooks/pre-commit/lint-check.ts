/** Run `pnpm lint` — the full monorepo lint pipeline (delegates to turbo). */

import { run } from "../post-agent-validation/utils.ts";

export async function lintCheck(cwd: string): Promise<string[]> {
    const result = await run(cwd, "pnpm lint");
    if (!result.ok) {
        return [`[lint] Lint failed:\n${result.stdout}${result.stderr}`];
    }
    return [];
}
