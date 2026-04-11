import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock SDK ────────────────────────────────────────────────────────────────

type MockMessage = { type: "result"; subtype: "success"; result: string; session_id: string };

let queryCallLog: { prompt: string; options: Record<string, unknown> }[] = [];
let agentResultMap: Record<string, string> = {};

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

function defaultQueryMock(params: { prompt: string | unknown; options?: Record<string, unknown> }) {
    queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
    const agentName = (params.options?.agent as string) ?? "unknown";
    const result = agentResultMap[agentName] ?? "";
    return createMockConversation(result);
}

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
    query: vi.fn<any>(defaultQueryMock)
}));

// ── Import under test ───────────────────────────────────────────────────────

import { runPlacement } from "../../../src/workflow/steps/placement.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function agentCallOrder(): string[] {
    return queryCallLog.map(call => call.options.agent as string);
}

const mockAgents = {
    "domain-mapper": { description: "mock", prompt: "mock" },
    "placement-gate": { description: "mock", prompt: "mock" },
    "evidence-researcher": { description: "mock", prompt: "mock" }
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("runPlacement", () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = mkdtempSync(join(tmpdir(), "placement-test-"));
        queryCallLog = [];
        agentResultMap = {};
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    afterEach(() => {
        rmSync(tmpDir, { recursive: true, force: true });
    });

    it("runs domain-mapper then placement-gate when everything passes", async () => {
        agentResultMap["placement-gate"] = "All placements look correct.";

        await runPlacement("Add plant watering feature", tmpDir, mockAgents);

        const order = agentCallOrder();

        // Each step runs exactly once
        expect(order.filter(a => a === "domain-mapper")).toHaveLength(1);
        expect(order.filter(a => a === "placement-gate")).toHaveLength(1);

        // domain-mapper runs before placement-gate
        expect(order.indexOf("domain-mapper")).toBeLessThan(order.indexOf("placement-gate"));

        // No evidence-researcher needed when placement passes
        expect(order.filter(a => a === "evidence-researcher")).toHaveLength(0);
    });

    it("runs evidence-researcher when placement-gate finds issues, then retries", async () => {
        let placementCallCount = 0;
        const { query: mockQuery } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(mockQuery).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
            const agentName = (params.options?.agent as string) ?? "unknown";

            if (agentName === "placement-gate") {
                placementCallCount++;
                const result = placementCallCount === 1 ? "Found issue: unclear module boundary." : "All placements verified.";
                return createMockConversation(result);
            }
            return createMockConversation("");
        }) as any);

        await runPlacement("Add plant list", tmpDir, mockAgents);

        const order = agentCallOrder();

        // Two iterations: first found issues, second passed
        expect(order.filter(a => a === "domain-mapper")).toHaveLength(2);
        expect(order.filter(a => a === "placement-gate")).toHaveLength(2);
        expect(order.filter(a => a === "evidence-researcher")).toHaveLength(1);

        // Evidence researcher runs between the two mapping attempts
        const erIndex = order.indexOf("evidence-researcher");
        const firstDM = order.indexOf("domain-mapper");
        const secondDM = order.lastIndexOf("domain-mapper");
        expect(erIndex).toBeGreaterThan(firstDM);
        expect(erIndex).toBeLessThan(secondDM);
    });

    it("respects max domain mapping attempts", async () => {
        agentResultMap["placement-gate"] = "Found issue: still broken.";

        await runPlacement("Feature", tmpDir, mockAgents);

        const order = agentCallOrder();
        const domainMapperCalls = order.filter(a => a === "domain-mapper");
        const evidenceResearcherCalls = order.filter(a => a === "evidence-researcher");

        expect(domainMapperCalls).toHaveLength(3);
        expect(evidenceResearcherCalls).toHaveLength(3);
    });

    it("creates .adlc directory structure", async () => {
        agentResultMap["placement-gate"] = "Fine.";

        await runPlacement("Feature", tmpDir, mockAgents);

        const { existsSync } = await import("node:fs");
        const { resolve } = await import("node:path");
        expect(existsSync(resolve(tmpDir, ".adlc/slices"))).toBe(true);
        expect(existsSync(resolve(tmpDir, ".adlc/implementation-notes"))).toBe(true);
        expect(existsSync(resolve(tmpDir, ".adlc/verification-results"))).toBe(true);
    });

    it("passes feature description to domain mapper", async () => {
        agentResultMap["placement-gate"] = "Fine.";

        await runPlacement("Add plant watering schedule", tmpDir, mockAgents);

        const domainMapperCall = queryCallLog.find(c => (c.options.agent as string) === "domain-mapper");
        expect(domainMapperCall?.prompt).toContain("Add plant watering schedule");
    });
});
