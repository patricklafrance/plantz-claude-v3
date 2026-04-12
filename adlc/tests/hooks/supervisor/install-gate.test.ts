import { describe, expect, it } from "vitest";

import {
    INSTALL_BYPASS_EVENT_TTL,
    checkInstallGate,
    consumeInstallBypass,
    clearExpiredInstallBypass,
    findInstallBypassData,
    isInstallCommand
} from "../../../src/hooks/supervisor/install-gate.js";
import type { SupervisorState } from "../../../src/hooks/supervisor/state.js";
import { createDefaultState } from "../../../src/hooks/supervisor/state.js";

function makeState(overrides: Partial<SupervisorState> = {}): SupervisorState {
    return { ...createDefaultState(), ...overrides };
}

function makeEvent(command: string, index = 1) {
    return {
        toolName: "Bash" as const,
        commandFingerprint: command,
        index
    };
}

describe("install-gate policy", () => {
    describe("isInstallCommand", () => {
        it("matches pnpm install", () => {
            expect(isInstallCommand("pnpm install")).toBe(true);
        });

        it("matches pnpm i", () => {
            expect(isInstallCommand("pnpm i")).toBe(true);
        });

        it("matches pnpm install with flags", () => {
            expect(isInstallCommand("pnpm install --frozen-lockfile")).toBe(true);
        });

        it("matches install in a compound command", () => {
            expect(isInstallCommand("cd /repo && pnpm install")).toBe(true);
        });

        it("matches install after a pipe", () => {
            expect(isInstallCommand("cat foo | pnpm install")).toBe(true);
        });

        it("does not match pnpm run", () => {
            expect(isInstallCommand("pnpm run build")).toBe(false);
        });

        it("does not match pnpm dev", () => {
            expect(isInstallCommand("pnpm dev")).toBe(false);
        });

        it("handles null/undefined", () => {
            expect(isInstallCommand(null)).toBe(false);
            expect(isInstallCommand(undefined)).toBe(false);
        });
    });

    describe("checkInstallGate", () => {
        it("returns null for non-Bash events", () => {
            const event = { toolName: "Read", commandFingerprint: undefined, index: 1 };
            const state = makeState();
            const result = checkInstallGate(event, state, { manifestDiff: false, overrideReason: null });
            expect(result).toBeNull();
        });

        it("returns null for non-install Bash events", () => {
            const event = makeEvent("pnpm lint");
            const state = makeState();
            const result = checkInstallGate(event, state, { manifestDiff: false, overrideReason: null });
            expect(result).toBeNull();
        });

        it("blocks pnpm install by default", () => {
            const event = makeEvent("pnpm install");
            const state = makeState();
            const result = checkInstallGate(event, state, { manifestDiff: false, overrideReason: null });
            expect(result!.action).toBe("block");
            expect(result!.reason).toContain(".adlc/allow-install");
        });

        it("allows pnpm install when manifestDiff is true", () => {
            const event = makeEvent("pnpm install");
            const state = makeState();
            const result = checkInstallGate(event, state, { manifestDiff: true, overrideReason: null });
            expect(result).toBeNull();
        });

        it("allows pnpm install when override reason is provided", () => {
            const event = makeEvent("pnpm install");
            const state = makeState();
            const result = checkInstallGate(event, state, { manifestDiff: false, overrideReason: "stale workspace" });
            expect(result!.action).toBe("allow");
            expect(result!.outcome).toBe("install-override-allowed");
            expect(result!.reason).toBe("stale workspace");
        });

        it("allows pnpm install when a valid bypass exists", () => {
            const state = makeState({
                eventCount: 5,
                installBypass: {
                    active: true,
                    reason: "missing-dependency-evidence",
                    matchedPattern: "Cannot find module '@plants/new-dep'",
                    sourceCommand: "pnpm dev-host",
                    createdAt: new Date().toISOString(),
                    remainingUses: 1,
                    expiresAfterEvent: 10
                }
            });
            const event = makeEvent("pnpm install", 6);
            const result = checkInstallGate(event, state, { manifestDiff: false, overrideReason: null });
            expect(result!.action).toBe("allow");
            expect(result!.outcome).toBe("install-bypass-consumed");
        });

        it("blocks when bypass has expired", () => {
            const state = makeState({
                eventCount: 15,
                installBypass: {
                    active: true,
                    reason: "missing-dependency-evidence",
                    matchedPattern: "Cannot find module '@plants/new-dep'",
                    sourceCommand: "pnpm dev-host",
                    createdAt: new Date().toISOString(),
                    remainingUses: 1,
                    expiresAfterEvent: 10
                }
            });
            const event = makeEvent("pnpm install", 16);
            const result = checkInstallGate(event, state, { manifestDiff: false, overrideReason: null });
            expect(result!.action).toBe("block");
        });
    });

    describe("findInstallBypassData", () => {
        it("returns null for non-Bash tools", () => {
            const state = makeState();
            const result = findInstallBypassData(state, "Read", {}, {});
            expect(result).toBeNull();
        });

        it("returns null when the command is an install command with non-lockfile error", () => {
            const state = makeState();
            const result = findInstallBypassData(
                state,
                "Bash",
                { command: "pnpm install" },
                {
                    error: { message: "Cannot find package 'some-pkg'" }
                }
            );
            expect(result).toBeNull();
        });

        it("allows self-healing when install fails with ERR_PNPM_OUTDATED_LOCKFILE", () => {
            const state = makeState({ eventCount: 5 });
            const result = findInstallBypassData(
                state,
                "Bash",
                { command: "pnpm install" },
                {
                    error: { message: "ERR_PNPM_OUTDATED_LOCKFILE" }
                }
            );
            expect(result).not.toBeNull();
            expect(result!.bypass.active).toBe(true);
            expect(result!.evidence.source).toBe("lockfile");
        });

        it("detects lockfile evidence from stderr", () => {
            const state = makeState({ eventCount: 5 });
            const result = findInstallBypassData(
                state,
                "Bash",
                { command: "pnpm dev-host" },
                {
                    toolResponse: { stderr: "ERR_PNPM_OUTDATED_LOCKFILE: something" }
                }
            );
            expect(result).not.toBeNull();
            expect(result!.bypass.active).toBe(true);
            expect(result!.bypass.remainingUses).toBe(1);
            expect(result!.bypass.expiresAfterEvent).toBe(5 + INSTALL_BYPASS_EVENT_TTL);
            expect(result!.evidence.source).toBe("lockfile");
        });

        it("detects package evidence from error message", () => {
            const state = makeState({ eventCount: 3 });
            const result = findInstallBypassData(
                state,
                "Bash",
                { command: "pnpm dev-host" },
                {
                    error: { message: "Error: Cannot find module '@plants/new-dep'" }
                }
            );
            expect(result).not.toBeNull();
            expect(result!.evidence.source).toBe("package");
            expect(result!.evidence.specifier).toBe("@plants/new-dep");
        });

        it("does not detect relative imports as package evidence", () => {
            const state = makeState();
            const result = findInstallBypassData(
                state,
                "Bash",
                { command: "pnpm dev-host" },
                {
                    toolResponse: { stderr: "Error: Cannot find module './local-file'" }
                }
            );
            expect(result).toBeNull();
        });

        it("does not detect alias imports as package evidence", () => {
            const state = makeState();
            const result = findInstallBypassData(
                state,
                "Bash",
                { command: "pnpm dev-host" },
                {
                    toolResponse: { stderr: "Error: Cannot find module '@/components/Button'" }
                }
            );
            expect(result).toBeNull();
        });

        it("returns null for generic failures", () => {
            const state = makeState();
            const result = findInstallBypassData(
                state,
                "Bash",
                { command: "pnpm lint" },
                {
                    error: { message: "Found 14 type errors" }
                }
            );
            expect(result).toBeNull();
        });
    });

    describe("consumeInstallBypass", () => {
        it("returns false when no bypass is active", () => {
            const state = makeState();
            expect(consumeInstallBypass(state, 1)).toBe(false);
        });

        it("consumes a valid bypass and nullifies it", () => {
            const state = makeState({
                installBypass: {
                    active: true,
                    reason: "missing-dependency-evidence",
                    matchedPattern: "test",
                    sourceCommand: "pnpm dev",
                    createdAt: new Date().toISOString(),
                    remainingUses: 1,
                    expiresAfterEvent: 10
                }
            });

            expect(consumeInstallBypass(state, 5)).toBe(true);
            expect(state.installBypass).toBeNull();
        });

        it("returns false and clears when bypass is expired", () => {
            const state = makeState({
                installBypass: {
                    active: true,
                    reason: "missing-dependency-evidence",
                    matchedPattern: "test",
                    sourceCommand: "pnpm dev",
                    createdAt: new Date().toISOString(),
                    remainingUses: 1,
                    expiresAfterEvent: 5
                }
            });

            expect(consumeInstallBypass(state, 10)).toBe(false);
            expect(state.installBypass).toBeNull();
        });
    });

    describe("clearExpiredInstallBypass", () => {
        it("clears an expired bypass", () => {
            const state = makeState({
                installBypass: {
                    active: true,
                    reason: "missing-dependency-evidence",
                    matchedPattern: "test",
                    sourceCommand: "pnpm dev",
                    createdAt: new Date().toISOString(),
                    remainingUses: 1,
                    expiresAfterEvent: 5
                }
            });

            clearExpiredInstallBypass(state, 10);
            expect(state.installBypass).toBeNull();
        });

        it("does not clear a non-expired bypass", () => {
            const state = makeState({
                installBypass: {
                    active: true,
                    reason: "missing-dependency-evidence",
                    matchedPattern: "test",
                    sourceCommand: "pnpm dev",
                    createdAt: new Date().toISOString(),
                    remainingUses: 1,
                    expiresAfterEvent: 10
                }
            });

            clearExpiredInstallBypass(state, 5);
            expect(state.installBypass).not.toBeNull();
        });
    });
});
