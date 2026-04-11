/** Full monorepo tests via turbo (vitest + Storybook a11y). */

import { run } from "../post-agent-validation/utils.js";

export async function testsCheck(cwd: string): Promise<string[]> {
    const result = await run(cwd, "pnpm test");
    if (!result.ok) {
        return [`[test] Tests failed:\n${result.stdout}${result.stderr}`];
    }
    return [];
}
