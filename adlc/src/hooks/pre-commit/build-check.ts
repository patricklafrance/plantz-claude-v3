/** Full monorepo build. */

import { run } from "../post-agent-validation/utils.js";

export async function buildCheck(cwd: string): Promise<string[]> {
    const result = await run(cwd, "pnpm build");
    if (!result.ok) {
        return [`[build] Build failed:\n${result.stdout}${result.stderr}`];
    }
    return [];
}
