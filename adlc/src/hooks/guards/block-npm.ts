import type { PreflightResult } from "./types.ts";
import { splitCommandSegments } from "./utils.ts";

const RULES: { pattern: RegExp; message: string }[] = [
    { pattern: /^npm(?:\s|$)/, message: "Blocked: use pnpm instead of npm." },
    { pattern: /^npx(?:\s|$)/, message: "Blocked: use pnpm exec instead of npx." },
    { pattern: /^pnpx(?:\s|$)/, message: "Blocked: pnpx is not allowed. Use pnpm exec instead." },
    { pattern: /^pnpm\s+dlx(?:\s|$)/, message: "Blocked: pnpm dlx is not allowed. Use pnpm exec instead." }
];

export default function checkBlockNpm(toolName: string, toolInput: Record<string, unknown>): PreflightResult | null {
    if (toolName !== "Bash") {
        return null;
    }

    const command = (toolInput?.command as string) ?? "";

    for (const segment of splitCommandSegments(command)) {
        for (const rule of RULES) {
            if (rule.pattern.test(segment)) {
                return { action: "block", reason: rule.message };
            }
        }
    }

    return null;
}
