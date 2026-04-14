import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock SDK ────────────────────────────────────────────────────────────────

type MockMessage = { type: "result"; subtype: "success"; result: string; session_id: string };

function createMockConversation(result: string): AsyncGenerator<MockMessage, void> {
    return (async function* () {
        yield {
            type: "result" as const,
            subtype: "success" as const,
            result,
            session_id: "mock-session-id"
        };
    })();
}

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
    query: vi.fn<any>(() => createMockConversation(""))
}));

vi.mock("../../../../src/workflow/agents.js", () => ({
    loadAllAgents: vi.fn<any>(() => ({
        explorer: { description: "mock", prompt: "mock" },
        "feature-coder": { description: "mock", prompt: "mock" },
        "feature-reviewer": { description: "mock", prompt: "mock" },
        "fix-coder": { description: "mock", prompt: "mock" },
        "fix-reviewer": { description: "mock", prompt: "mock" },
        "feature-slice-coordinator": { description: "mock", prompt: "mock" },
        "fix-slice-coordinator": { description: "mock", prompt: "mock" }
    })),
    loadAgent: vi.fn<any>(() => ({ name: "_adlc-coder", definition: { description: "mock", prompt: "mock" } })),
    runAgent: vi.fn<any>(async () => "resolved")
}));

// ── Mock git / worktree operations ──────────────────────────────────────────

const mockWorktrees: { path: string; branch: string; sliceName: string }[] = [];
const mockMergedBranches: string[] = [];
const mockRemovedWorktrees: string[] = [];

vi.mock("../../../../src/workflow/steps/slices/worktree/lifecycle.js", () => ({
    createWorktree: vi.fn<any>((sliceName: string, _baseBranch: string, cwd: string, runDir: string) => {
        const wtPath = join(runDir, "worktrees", sliceName);
        mkdirSync(wtPath, { recursive: true });
        const wt = { path: wtPath, branch: `adlc/${sliceName}`, sliceName };
        mockWorktrees.push(wt);
        return wt;
    }),
    removeWorktreeAsync: vi.fn<any>((worktreePath: string) => {
        mockRemovedWorktrees.push(worktreePath);
        return Promise.resolve();
    })
}));

let mockMergeResults: Record<string, { success: boolean; conflictFiles?: string[] }> = {};

vi.mock("../../../../src/workflow/steps/slices/worktree/merger.js", () => ({
    attemptMerge: vi.fn<any>((worktreeBranch: string) => {
        mockMergedBranches.push(worktreeBranch);
        return mockMergeResults[worktreeBranch] ?? { success: true };
    }),
    completeMerge: vi.fn<any>(),
    abortMerge: vi.fn<any>(),
    mergeWorktree: vi.fn<any>((worktreeBranch: string) => {
        mockMergedBranches.push(worktreeBranch);
        return mockMergeResults[worktreeBranch] ?? { success: true };
    })
}));

vi.mock("../../../../src/workflow/steps/slices/worktree/seeder.js", () => ({
    seedAdlc: vi.fn<any>(async () => {})
}));

vi.mock("../../../../src/workflow/steps/slices/worktree/collector.js", () => ({
    collectResults: vi.fn<any>(async () => {})
}));

// ── Mock metrics (getRunDirName) ─────────────────────────────────────────────

vi.mock("../../../../src/hooks/post-agent-validation/metrics.js", () => ({
    getRunDirName: vi.fn<any>(() => "test-run"),
    handleStopMetrics: vi.fn<any>(async () => ({ continue: true })),
    recordMetrics: vi.fn<any>()
}));

// ── Mock revision-loop ──────────────────────────────────────────────────────

let slicePipelineResults: Record<string, { success: boolean; reason?: string }> = {};

vi.mock("../../../../src/workflow/steps/slices/revision-loop.js", () => ({
    runSlicePipeline: vi.fn<any>(async (sliceName: string) => {
        return slicePipelineResults[sliceName] ?? { success: true };
    })
}));

// ── Mock promisify(exec) so pnpm install is a no-op ───────────────────────

vi.mock("node:util", () => ({
    promisify: () => async () => ({ stdout: "", stderr: "" })
}));

// ── Import under test ───────────────────────────────────────────────────────

import { resolveConfig } from "../../../../src/config.js";
import { runSlices } from "../../../../src/workflow/steps/slices/run-slices.js";

const config = resolveConfig({});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runSlices", () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = mkdtempSync(join(tmpdir(), "slicing-test-"));
        mockWorktrees.length = 0;
        mockMergedBranches.length = 0;
        mockRemovedWorktrees.length = 0;
        slicePipelineResults = {};
        mockMergeResults = {};

        // Clear mock call history (toHaveBeenCalled assertions need a clean slate).
        vi.clearAllMocks();

        // Create .adlc/test-run structure with slice files
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        mkdirSync(slicesDir, { recursive: true });
        mkdirSync(join(tmpDir, ".adlc", "test-run", "implementation-notes"), { recursive: true });
        writeFileSync(join(tmpDir, ".adlc", "test-run", "plan-header.md"), "# Plan\n");
        writeFileSync(join(tmpDir, ".adlc", "test-run", "domain-mapping.md"), "# Domain mapping\n");

        // Vitest 4 no longer restores vi.fn() factory mocks via vi.restoreAllMocks(),
        // so re-apply default implementations for mocks that tests override.
        const { runSlicePipeline } = await import("../../../../src/workflow/steps/slices/revision-loop.js");
        vi.mocked(runSlicePipeline).mockImplementation(async (sliceName: string) => {
            return slicePipelineResults[sliceName] ?? { success: true };
        });

        const { seedAdlc } = await import("../../../../src/workflow/steps/slices/worktree/seeder.js");
        vi.mocked(seedAdlc).mockImplementation(async () => {});

        const { runAgent } = await import("../../../../src/workflow/agents.js");
        vi.mocked(runAgent).mockImplementation(async () => ({ result: "resolved", sessionId: "test-session" }));
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    const baseOptions = {
        cwd: "", // overridden per test
        featureBranch: "feat/test-feature",
        input: { type: "feat-text" as const, description: "test feature" }
    };

    it("executes independent slices in a single wave", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-alpha.md"), "# Slice 1 -- Alpha\nContent.\n");
        writeFileSync(join(slicesDir, "02-beta.md"), "# Slice 2 -- Beta\nContent.\n");

        await runSlices(tmpDir, config, "", { ...baseOptions, cwd: tmpDir });

        expect(mockWorktrees).toHaveLength(2);
        expect(mockWorktrees[0].sliceName).toBe("alpha");
        expect(mockWorktrees[1].sliceName).toBe("beta");
        expect(mockMergedBranches).toHaveLength(2);
        expect(mockRemovedWorktrees).toHaveLength(2);
    });

    it("executes dependent slices in sequential waves", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-base.md"), "# Slice 1 -- Base\nBase slice.\n");
        writeFileSync(join(slicesDir, "02-feature.md"), "# Slice 2 -- Feature\n\n> **Depends on:** Slice 1\n\nFeature.\n");

        const { runSlicePipeline } = await import("../../../../src/workflow/steps/slices/revision-loop.js");
        const callOrder: string[] = [];
        vi.mocked(runSlicePipeline).mockImplementation(async (sliceName: string) => {
            callOrder.push(sliceName);
            return { success: true };
        });

        await runSlices(tmpDir, config, "", { ...baseOptions, cwd: tmpDir });

        expect(callOrder).toEqual(["base", "feature"]);
    });

    it("does not merge a failed slice", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-good.md"), "# Slice 1 -- Good\nContent.\n");
        writeFileSync(join(slicesDir, "02-bad.md"), "# Slice 2 -- Bad\nContent.\n");

        slicePipelineResults["bad"] = { success: false, reason: "max revision attempts exceeded" };

        await runSlices(tmpDir, config, "", { ...baseOptions, cwd: tmpDir });

        expect(mockMergedBranches).toHaveLength(1);
        expect(mockMergedBranches[0]).toBe("adlc/good");
        expect(mockRemovedWorktrees).toHaveLength(2);
    });

    it("does not merge a slice that threw an exception", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-crash.md"), "# Slice 1 -- Crash\nContent.\n");

        const { runSlicePipeline } = await import("../../../../src/workflow/steps/slices/revision-loop.js");
        vi.mocked(runSlicePipeline).mockRejectedValue(new Error("Unexpected crash"));

        await runSlices(tmpDir, config, "", { ...baseOptions, cwd: tmpDir });

        expect(mockMergedBranches).toHaveLength(0);
        expect(mockRemovedWorktrees).toHaveLength(1);
    });

    it("resolves merge conflicts via coder agent then completes merge", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-alpha.md"), "# Slice 1 -- Alpha\nContent.\n");

        mockMergeResults["adlc/alpha"] = { success: false, conflictFiles: ["index.ts"] };

        const { runAgent } = await import("../../../../src/workflow/agents.js");
        vi.mocked(runAgent).mockResolvedValue({ result: "resolved", sessionId: "test-session" });

        await runSlices(tmpDir, config, "", { ...baseOptions, cwd: tmpDir });

        const { completeMerge } = await import("../../../../src/workflow/steps/slices/worktree/merger.js");
        expect(runAgent).toHaveBeenCalled();
        expect(completeMerge).toHaveBeenCalled();
    });

    it("cleans up worktrees when seeding throws", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-leak.md"), "# Slice 1 -- Leak\nContent.\n");

        const { seedAdlc } = await import("../../../../src/workflow/steps/slices/worktree/seeder.js");
        vi.mocked(seedAdlc).mockRejectedValue(new Error("seed failed"));

        await expect(runSlices(tmpDir, config, "", { ...baseOptions, cwd: tmpDir })).rejects.toThrow("seed failed");

        expect(mockRemovedWorktrees).toHaveLength(1);
    });

    it("aborts merge when coder agent fails to resolve conflicts", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-beta.md"), "# Slice 1 -- Beta\nContent.\n");

        mockMergeResults["adlc/beta"] = { success: false, conflictFiles: ["config.ts"] };

        const { runAgent } = await import("../../../../src/workflow/agents.js");
        vi.mocked(runAgent).mockRejectedValue(new Error("Agent failed"));

        await runSlices(tmpDir, config, "", { ...baseOptions, cwd: tmpDir });

        const { abortMerge, completeMerge } = await import("../../../../src/workflow/steps/slices/worktree/merger.js");
        expect(abortMerge).toHaveBeenCalled();
        expect(completeMerge).not.toHaveBeenCalled();
    });

    it("passes fix-slice-coordinator to pipeline in fix mode", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-alpha.md"), "# Slice 1 -- Alpha\nContent.\n");

        const { runSlicePipeline } = await import("../../../../src/workflow/steps/slices/revision-loop.js");
        vi.mocked(runSlicePipeline).mockResolvedValue({ success: true });

        const fixOptions = {
            cwd: tmpDir,
            featureBranch: "feat/test-feature",
            input: { type: "fix-pr" as const, prNumber: 42 }
        };

        await runSlices(tmpDir, config, "", fixOptions);

        expect(runSlicePipeline).toHaveBeenCalledWith(
            "alpha",
            expect.any(String),
            expect.any(Object),
            "",
            config,
            tmpDir,
            undefined,
            "fix-slice-coordinator"
        );
    });

    it("uses fix-coder for merge conflict resolution in fix mode", async () => {
        const slicesDir = join(tmpDir, ".adlc", "test-run", "slices");
        writeFileSync(join(slicesDir, "01-alpha.md"), "# Slice 1 -- Alpha\nContent.\n");

        mockMergeResults["adlc/alpha"] = { success: false, conflictFiles: ["index.ts"] };

        const { runAgent } = await import("../../../../src/workflow/agents.js");
        vi.mocked(runAgent).mockResolvedValue({ result: "resolved", sessionId: "test-session" });

        const fixOptions = {
            cwd: tmpDir,
            featureBranch: "feat/test-feature",
            input: { type: "fix-text" as const, description: "fix something" }
        };

        await runSlices(tmpDir, config, "", fixOptions);

        expect(runAgent).toHaveBeenCalledWith(
            "fix-coder",
            expect.stringContaining("resolving merge conflicts"),
            expect.any(String),
            expect.any(Object),
            undefined,
            expect.any(Object)
        );
    });
});
