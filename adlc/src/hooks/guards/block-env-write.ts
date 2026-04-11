import type { PreflightResult } from "./types.ts";

const MESSAGE = "Blocked: do not modify .env files — environment secrets must not be touched by the harness.";
const ENV_PATTERN = /(?:^|[\\/])\.env(?:\..+)?$/;

export default function checkBlockEnvWrite(toolName: string, toolInput: Record<string, unknown>): PreflightResult | null {
    if (toolName === "Edit" || toolName === "Write") {
        const filePath = (toolInput?.file_path as string) ?? "";
        if (ENV_PATTERN.test(filePath)) {
            return { action: "block", reason: MESSAGE };
        }
    }

    return null;
}
