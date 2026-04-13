import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock SDK ────────────────────────────────────────────────────────────────

type MockMessage = { type: "result"; subtype: "success"; result: string; session_id: string };

let queryCallLog: { prompt: string; options: Record<string, unknown> }[] = [];

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
    query: vi.fn<any>((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
        queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
        return createMockConversation("Slice passed verification");
    })
}));

vi.mock("../../../../src/workflow/agents.js", () => ({
    loadAllAgents: vi.fn<any>(() => ({
        "slice-coordinator": { description: "mock", prompt: "mock" }
    })),
    runAgent: vi.fn<any>()
}));

const mockHooksSentinel = { SubagentStop: [{ hooks: ["mock-hook-sentinel"] }] };

vi.mock("../../../../src/hooks/create-hooks.js", () => ({
    createHooks: vi.fn<any>(() => ({
        hooks: mockHooksSentinel
    }))
}));

vi.mock("../../../../src/hooks/post-agent-validation/metrics.js", () => ({
    getRunDirName: vi.fn<any>(() => "test-run")
}));

// ── Import under test ───────────────────────────────────────────────────────

import { resolveConfig } from "../../../../src/config.js";
import type { Ports } from "../../../../src/ports.js";
import { runAgent } from "../../../../src/workflow/agents.js";
import { runSlicePipeline } from "../../../../src/workflow/steps/slices/revision-loop.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

const defaultPorts: Ports = { storybook: 6100, hostApp: 8100, browser: 9200 };
const defaultConfig = resolveConfig({});
const defaultPreamble = "";

/** Extract the runAgent call args as named properties — decouples tests from parameter order. */
function getRunAgentCall() {
    const [agentName, prompt, cwd, agents, progress, hooks, resumeSessionId, env] =
        vi.mocked(runAgent).mock.calls[0] as [string, string, string, unknown, unknown, unknown, unknown, Record<string, string> | undefined];
    return { agentName, prompt, cwd, agents, progress, hooks, resumeSessionId, env };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runSlicePipeline", () => {
    beforeEach(() => {
        queryCallLog = [];
        vi.mocked(runAgent).mockResolvedValue({ result: "Slice passed verification", sessionId: "mock-session-id" });
    });

    it("delegates to slice-coordinator agent", async () => {
        await runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd");

        expect(runAgent).toHaveBeenCalledOnce();
        expect(getRunAgentCall().agentName).toBe("slice-coordinator");
    });

    it("passes slice name in the prompt", async () => {
        await runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd");

        expect(getRunAgentCall().prompt).toContain("plant-list");
    });

    it("passes port env variables to the coordinator", async () => {
        await runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd");

        expect(getRunAgentCall().env).toEqual({
            STORYBOOK_PORT: "6100",
            HOST_APP_PORT: "8100",
            BROWSER_PORT: "9200"
        });
    });

    it("returns success when coordinator completes normally", async () => {
        vi.mocked(runAgent).mockResolvedValue({ result: "Slice passed verification", sessionId: "s1" });

        const result = await runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd");

        expect(result).toEqual({ success: true });
    });

    it("returns success for any non-failure coordinator result", async () => {
        vi.mocked(runAgent).mockResolvedValue({ result: "All done, everything looks good", sessionId: "s1" });

        const result = await runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd");

        expect(result).toEqual({ success: true });
    });

    it("returns failure when coordinator reports max revision attempts exceeded", async () => {
        vi.mocked(runAgent).mockResolvedValue({ result: "Max revision attempts exceeded: tests broken", sessionId: "s1" });

        const result = await runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd");

        expect(result).toEqual({ success: false, reason: "Max revision attempts exceeded: tests broken" });
    });

    it("returns failure with default reason when coordinator returns empty result", async () => {
        vi.mocked(runAgent).mockResolvedValue({ result: "", sessionId: "s1" });

        const result = await runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd");

        expect(result).toEqual({ success: false, reason: "coordinator reported failure" });
    });

    it("propagates when runAgent throws", async () => {
        vi.mocked(runAgent).mockRejectedValue(new Error("SDK connection lost"));

        await expect(
            runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd")
        ).rejects.toThrow("SDK connection lost");
    });

    it("forwards hooks from createHooks to the coordinator", async () => {
        await runSlicePipeline("plant-list", "/tmp/wt", defaultPorts, defaultPreamble, defaultConfig, "/tmp/cwd");

        expect(getRunAgentCall().hooks).toBe(mockHooksSentinel);
    });
});
