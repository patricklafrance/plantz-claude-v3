/** Block commits that un-ignore .adlc/ or .adlc-metrics/ paths — all ADLC artifacts are ephemeral. */

import { run } from "../post-agent-validation/utils.ts";

const EPHEMERAL_PREFIXES = ["!.adlc/", "!.adlc-metrics/"];

export async function gitignoreCheck(cwd: string): Promise<string[]> {
    const result = await run(cwd, "git diff --cached -- .gitignore");
    if (!result.ok || !result.stdout) {
        return [];
    }

    const added = result.stdout
        .split("\n")
        .filter(line => line.startsWith("+") && !line.startsWith("+++"))
        .map(line => line.slice(1).trim());

    const violations = added.filter(line => EPHEMERAL_PREFIXES.some(prefix => line.startsWith(prefix)));

    if (violations.length > 0) {
        return [
            `[gitignore-check] .gitignore must not un-ignore .adlc/ or .adlc-metrics/ paths (all ADLC artifacts are ephemeral):\n${violations.map(v => `  ${v}`).join("\n")}`
        ];
    }

    return [];
}
