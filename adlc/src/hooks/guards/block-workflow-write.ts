import type { PreflightResult } from "./types.ts";

const MESSAGE = "Blocked: do not modify .github/workflows/ files — CI workflows are managed outside the harness.";
const WORKFLOW_PATTERN = /(?:^|[\\/\s])\.github[\\/]workflows[\\/]/;

export default function checkBlockWorkflowWrite(toolName: string, toolInput: Record<string, unknown>): PreflightResult | null {
    if (toolName === "Edit" || toolName === "Write") {
        const filePath = (toolInput?.file_path as string) ?? "";
        if (WORKFLOW_PATTERN.test(filePath)) {
            return { action: "block", reason: MESSAGE };
        }
    }

    if (toolName === "Bash") {
        const command = (toolInput?.command as string) ?? "";
        if (WORKFLOW_PATTERN.test(command)) {
            return { action: "block", reason: MESSAGE };
        }
    }

    return null;
}
