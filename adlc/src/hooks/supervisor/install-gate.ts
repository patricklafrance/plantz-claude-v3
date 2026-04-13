import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { splitCommandSegments } from "../guards/utils.ts";
import { getRunDirName } from "../post-agent-validation/metrics.ts";
import type { SupervisorState } from "./state.ts";

interface InstallGateResult {
    action: "allow" | "block";
    outcome?: string;
    reason?: string;
}

interface InstallEvidence {
    matchedPattern: string;
    source: "lockfile" | "package";
    specifier?: string;
}

interface InstallBypassData {
    bypass: {
        active: boolean;
        reason: string;
        matchedPattern: string;
        sourceCommand: string;
        createdAt: string;
        remainingUses: number;
        expiresAfterEvent: number;
    };
    evidence: InstallEvidence;
}

interface ToolPayload {
    toolResponse?: {
        stdout?: string | string[];
        stderr?: string | string[];
        message?: string | string[];
    };
    error?: {
        message?: string | string[];
        stderr?: string | string[];
        stdout?: string | string[];
    };
}

// Bypass token expires after 5 pre-tool events. Long enough for the agent to do a
// few Read/Grep calls between seeing the evidence and attempting pnpm install; short
// enough that an unrelated later install attempt cannot reuse the token.
export const INSTALL_BYPASS_EVENT_TTL = 5;
const ALLOW_INSTALL_FILENAME = "allow-install";
const INSTALL_COMMAND_PATTERN = /^pnpm\s+(?:install|i)(?:\s|$)/;
const MANIFEST_PATHSPEC = [".", ":(glob)**/package.json", "pnpm-lock.yaml"];
const LOCKFILE_PATTERNS = [/ERR_PNPM_OUTDATED_LOCKFILE/i, /pnpm-lock\.yaml.*out of date/i];
const PACKAGE_SPECIFIER_PATTERNS = [
    /cannot find module ['"]([^'"]+)['"]/i,
    /cannot find package ['"]([^'"]+)['"]/i,
    /module not found[^"'`]*['"`]([^"'`]+)['"`]/i
];

/**
 * Install gate: block `pnpm install` / `pnpm i` unless the repo has manifest drift,
 * a run-scoped manual override exists, or a short-lived missing-dependency bypass
 * token was recorded from real Bash output.
 *
 * Pure policy: no I/O, no state mutations. Caller pre-fetches { manifestDiff, overrideReason }
 * and applies any state side-effects (bypass consumption, expiry clearing) after the decision.
 */
export function checkInstallGate(
    event: { toolName: string; commandFingerprint?: string; index: number },
    state: SupervisorState,
    { manifestDiff, overrideReason }: { manifestDiff: boolean; overrideReason: string | null }
): InstallGateResult | null {
    if (event.toolName !== "Bash" || !isInstallCommand(event.commandFingerprint)) {
        return null;
    }

    if (manifestDiff) {
        return null;
    }

    if (overrideReason) {
        return {
            action: "allow",
            outcome: "install-override-allowed",
            reason: overrideReason
        };
    }

    if (isValidBypass(state.installBypass, event.index)) {
        return {
            action: "allow",
            outcome: "install-bypass-consumed"
        };
    }

    return {
        action: "block",
        reason: [
            "Blocked: pnpm install requires evidence or an explicit run-scoped override.",
            "",
            "Allowed automatically when:",
            "- package.json or pnpm-lock.yaml changed",
            "- recent Bash output showed a real missing-dependency failure",
            "",
            "Manual override:",
            `- write a short justification to the \`allow-install\` file in the ADLC run directory`,
            "- retry pnpm install",
            "- the override stays active for this agent run and is cleared on SubagentStop"
        ].join("\n")
    };
}

/**
 * Pure: extracts bypass data from a tool result payload without mutating state.
 * Caller applies the bypass to state if a non-null value is returned.
 */
export function findInstallBypassData(
    state: SupervisorState,
    toolName: string,
    toolInput: { command?: string } = {},
    payload: ToolPayload = {}
): InstallBypassData | null {
    if (toolName !== "Bash") {
        return null;
    }

    const command = String(toolInput.command ?? "");

    const evidence = findInstallEvidence(payload);
    if (!evidence) {
        return null;
    }

    // Block self-granting from install commands for most errors (prevents blind
    // retry loops), but allow it for lockfile staleness — ERR_PNPM_OUTDATED_LOCKFILE
    // is a deterministic error where re-running pnpm install is the only fix.
    if (isInstallCommand(command) && evidence.source !== "lockfile") {
        return null;
    }

    return {
        bypass: {
            active: true,
            reason: "missing-dependency-evidence",
            matchedPattern: evidence.matchedPattern,
            sourceCommand: command.trim(),
            createdAt: new Date().toISOString(),
            remainingUses: 1,
            expiresAfterEvent: state.eventCount + INSTALL_BYPASS_EVENT_TTL
        },
        evidence
    };
}

export function isInstallCommand(command: string | null | undefined): boolean {
    for (const segment of splitCommandSegments(command)) {
        if (INSTALL_COMMAND_PATTERN.test(segment)) {
            return true;
        }
    }

    return false;
}

export function hasManifestDiff(cwd: string): boolean {
    try {
        return (
            getManifestCandidates(cwd, ["diff", "--name-only", "HEAD", "--", ...MANIFEST_PATHSPEC]).length > 0 ||
            getManifestCandidates(cwd, ["ls-files", "--others", "--exclude-standard", "--", ...MANIFEST_PATHSPEC]).length > 0
        );
    } catch {
        return false;
    }
}

export function readInstallOverride(cwd: string): string | null {
    const runDirName = getRunDirName();
    if (!runDirName) {
        return null;
    }

    const overridePath = resolve(cwd, ".adlc", runDirName, ALLOW_INSTALL_FILENAME);
    if (!existsSync(overridePath)) {
        return null;
    }

    const reason = readFileSync(overridePath, "utf8").trim();
    return reason.length > 0 ? reason : null;
}

export function consumeInstallBypass(state: SupervisorState, eventIndex: number): boolean {
    if (!state.installBypass?.active) {
        return false;
    }

    if (state.installBypass.expiresAfterEvent != null && eventIndex > state.installBypass.expiresAfterEvent) {
        state.installBypass = null;
        return false;
    }

    const remainingUses = Math.max(0, Number(state.installBypass.remainingUses ?? 1) - 1);
    state.installBypass = remainingUses > 0 ? { ...state.installBypass, remainingUses } : null;

    return true;
}

export function clearExpiredInstallBypass(state: SupervisorState, eventIndex: number): void {
    if (state.installBypass?.active && state.installBypass.expiresAfterEvent != null && eventIndex > state.installBypass.expiresAfterEvent) {
        state.installBypass = null;
    }
}

function isValidBypass(bypass: SupervisorState["installBypass"], eventIndex: number): boolean {
    if (!bypass?.active) {
        return false;
    }

    if (bypass.expiresAfterEvent != null && eventIndex > bypass.expiresAfterEvent) {
        return false;
    }

    return (bypass.remainingUses ?? 1) > 0;
}

function findInstallEvidence(payload: ToolPayload): InstallEvidence | null {
    const text = collectPayloadText(payload);
    if (!text) {
        return null;
    }

    for (const pattern of LOCKFILE_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            return {
                matchedPattern: match[0],
                source: "lockfile"
            };
        }
    }

    for (const pattern of PACKAGE_SPECIFIER_PATTERNS) {
        const match = text.match(pattern);
        const specifier = match?.[1]?.trim();
        if (!specifier || !isPackageSpecifier(specifier)) {
            continue;
        }

        return {
            matchedPattern: match![0],
            source: "package",
            specifier
        };
    }

    return null;
}

function collectPayloadText(payload: ToolPayload): string {
    const chunks = [
        payload.toolResponse?.stdout,
        payload.toolResponse?.stderr,
        payload.toolResponse?.message,
        payload.error?.message,
        payload.error?.stderr,
        payload.error?.stdout
    ];

    return chunks
        .flatMap(value => (Array.isArray(value) ? value : [value]))
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join("\n");
}

function isPackageSpecifier(specifier: string): boolean {
    return (
        !/^\.{1,2}(?:\/|\\|$)/.test(specifier) &&
        !/^(?:[A-Za-z]:)?[\\/]/.test(specifier) &&
        !/^file:/i.test(specifier) &&
        !/^[@#~]\//.test(specifier) &&
        !specifier.startsWith("#")
    );
}

function getManifestCandidates(cwd: string, args: string[]): string[] {
    const stdout = execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"]
    });

    return stdout
        .split(/\r?\n/u)
        .map(line => line.trim())
        .filter(Boolean)
        .filter(path => /(?:^|\/)package\.json$/.test(path) || path === "pnpm-lock.yaml");
}
