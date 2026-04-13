import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock SDK ────────────────────────────────────────────────────────────────

type MockMessage = { type: "result"; subtype: "success"; result: string; session_id: string };

let queryCallLog: { prompt: string; options: Record<string, unknown> }[] = [];
let tmp: string;

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
    return createMockConversation("");
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
    beforeEach(async () => {
        tmp = mkdtempSync(join(tmpdir(), "placement-test-"));
        queryCallLog = [];
        const { query } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(query).mockImplementation(defaultQueryMock as any);
    });

    afterEach(() => {
        rmSync(tmp, { recursive: true, force: true });
    });

    it("runs domain-mapper then placement-gate when everything passes", async () => {
        await runPlacement("Add plant watering feature", tmp, mockAgents);

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
                if (placementCallCount === 1) {
                    // First gate call writes a revision file (gate fails)
                    mkdirSync(join(tmp, ".adlc"), { recursive: true });
                    writeFileSync(join(tmp, ".adlc", "placement-gate-revision.md"), "### ISSUE-1: Bad boundary");
                } else {
                    // Second gate call: revision file was cleaned up by mapper re-run
                    try { unlinkSync(join(tmp, ".adlc", "placement-gate-revision.md")); } catch { /* already gone */ }
                }
            }
            return createMockConversation("");
        }) as any);

        await runPlacement("Add plant list", tmp, mockAgents);

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
        const { query: mockQuery } = await import("@anthropic-ai/claude-agent-sdk");
        vi.mocked(mockQuery).mockImplementation(((params: { prompt: string | unknown; options?: Record<string, unknown> }) => {
            queryCallLog.push({ prompt: params.prompt as string, options: params.options ?? {} });
            const agentName = (params.options?.agent as string) ?? "unknown";

            if (agentName === "placement-gate") {
                mkdirSync(join(tmp, ".adlc"), { recursive: true });
                writeFileSync(join(tmp, ".adlc", "placement-gate-revision.md"), "### ISSUE-1: Always broken");
            }
            return createMockConversation("");
        }) as any);

        await runPlacement("Feature", tmp, mockAgents);

        const order = agentCallOrder();
        const domainMapperCalls = order.filter(a => a === "domain-mapper");
        const evidenceResearcherCalls = order.filter(a => a === "evidence-researcher");

        expect(domainMapperCalls).toHaveLength(3);
        expect(evidenceResearcherCalls).toHaveLength(3);
    });

    it("passes feature description to domain mapper", async () => {
        await runPlacement("Add plant watering schedule", tmp, mockAgents);

        const domainMapperCall = queryCallLog.find(c => (c.options.agent as string) === "domain-mapper");
        expect(domainMapperCall?.prompt).toContain("Add plant watering schedule");
    });

    it("forwards hooks to every agent call", async () => {
        // eslint-disable-next-line vitest/require-mock-type-parameters -- complex SDK hook signature
        const fakeHooks = { SubagentStop: [{ hooks: [vi.fn()] }] };

        await runPlacement("Add watering", tmp, mockAgents, undefined, fakeHooks);

        expect(queryCallLog.length).toBeGreaterThan(0);
        for (const call of queryCallLog) {
            expect(call.options.hooks).toBe(fakeHooks);
        }
    });
});
