import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
    "evidence-researcher": { description: "mock", prompt: "mock" },
    "domain-challenger": { description: "mock", prompt: "mock" }
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

    it("runs full pipeline when gate passes on first attempt", async () => {
        await runPlacement("Add plant watering feature", tmp, mockAgents);

        const order = agentCallOrder();

        // Each step runs exactly once
        expect(order.filter(a => a === "domain-mapper")).toHaveLength(1);
        expect(order.filter(a => a === "evidence-researcher")).toHaveLength(1);
        expect(order.filter(a => a === "domain-challenger")).toHaveLength(1);
        expect(order.filter(a => a === "placement-gate")).toHaveLength(1);

        // Pipeline ordering: mapper → evidence → challenge → gate
        expect(order.indexOf("domain-mapper")).toBeLessThan(order.indexOf("evidence-researcher"));
        expect(order.indexOf("evidence-researcher")).toBeLessThan(order.indexOf("domain-challenger"));
        expect(order.indexOf("domain-challenger")).toBeLessThan(order.indexOf("placement-gate"));
    });

    it("retries when placement-gate finds issues", async () => {
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
                }
                // Second gate call: file was cleaned at top of iteration — gate passes
            }
            return createMockConversation("");
        }) as any);

        await runPlacement("Add plant list", tmp, mockAgents);

        const order = agentCallOrder();

        // Two full iterations
        expect(order.filter(a => a === "domain-mapper")).toHaveLength(2);
        expect(order.filter(a => a === "evidence-researcher")).toHaveLength(2);
        expect(order.filter(a => a === "domain-challenger")).toHaveLength(2);
        expect(order.filter(a => a === "placement-gate")).toHaveLength(2);
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

        // All four agents run each iteration
        expect(order.filter(a => a === "domain-mapper")).toHaveLength(3);
        expect(order.filter(a => a === "evidence-researcher")).toHaveLength(3);
        expect(order.filter(a => a === "domain-challenger")).toHaveLength(3);
        expect(order.filter(a => a === "placement-gate")).toHaveLength(3);
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
