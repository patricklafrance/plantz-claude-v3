import type { PreflightResult } from "./types.ts";
import { splitCommandSegments } from "./utils.ts";

const MESSAGE = "Blocked: use bash directly, not Windows cmd.";

export default function checkBlockWindowsCmd(toolName: string, toolInput: Record<string, unknown>): PreflightResult | null {
    if (toolName !== "Bash") {
        return null;
    }

    const command = (toolInput?.command as string) ?? "";

    for (const segment of splitCommandSegments(command)) {
        if (/^cmd(?:\.exe)?(?:\s|$)/i.test(segment)) {
            return { action: "block", reason: MESSAGE };
        }
    }

    return null;
}
