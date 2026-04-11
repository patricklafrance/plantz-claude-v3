/**
 * Builds SupervisorEvent objects from SDK hook inputs.
 *
 * Ported from agent-hooks/src/adlc-supervisor/context.mjs + utils.mjs.
 */

import type { SupervisorEvent, SupervisorState } from "./state.ts";

// ── Command utilities ────────────────────────────────────────────────

function normalizePath(filePath: unknown): string {
    return String(filePath ?? "").replaceAll("\\", "/");
}

function getTargetPath(toolName: string, toolInput: Record<string, unknown>): string {
    if (toolName === "Read" || toolName === "Write" || toolName === "Edit") {
        return normalizePath(toolInput.file_path);
    }

    return "";
}

function fingerprintCommand(command: string): string {
    return command.replace(/\s+/g, " ").trim();
}

function isBrowserCommand(command: string): boolean {
    return /(?:pnpm\s+exec\s+)?agent-browser\b/.test(command);
}

function isScreenshotCommand(command: string): boolean {
    return isBrowserCommand(command) && /\bscreenshot\b/.test(command);
}

function extractBrowserTarget(command: string): string | null {
    if (!isBrowserCommand(command)) {
        return null;
    }

    const match = command.match(/agent-browser\s+open\s+(https?:\/\/\S+)/);

    return match ? match[1] : null;
}

function isTestCommand(command: string): boolean {
    return /\b(pnpm\s+(--filter\s+\S+\s+)?test\b|pnpm\s+turbo\s+run\s+test\b|vitest\b)/.test(command);
}

// ── Event builder ────────────────────────────────────────────────────

export function buildPreToolEvent(
    toolName: string,
    toolInput: Record<string, unknown>,
    agentName: string | null,
    state: SupervisorState
): SupervisorEvent {
    const command = toolName === "Bash" ? String(toolInput?.command ?? "") : "";

    return {
        index: state.eventCount + 1,
        timestamp: Date.now(),
        toolName,
        targetPath: getTargetPath(toolName, toolInput),
        commandFingerprint: toolName === "Bash" ? fingerprintCommand(command) : undefined,
        isBrowserCommand: toolName === "Bash" ? isBrowserCommand(command) : false,
        isScreenshotCommand: toolName === "Bash" ? isScreenshotCommand(command) : false,
        isTestCommand: toolName === "Bash" ? isTestCommand(command) : false,
        browserTarget: toolName === "Bash" ? (extractBrowserTarget(command) ?? undefined) : undefined
    };
}
