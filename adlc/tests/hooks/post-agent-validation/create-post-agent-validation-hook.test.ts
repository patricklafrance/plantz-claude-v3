import { describe, expect, it, vi } from "vitest";

import { createPostAgentValidationHook } from "../../../src/hooks/post-agent-validation/create-post-agent-validation-hook.js";
import type { SubagentStopHookInput } from "../../../src/hooks/types.js";

// Mock metrics — avoid filesystem side effects
vi.mock("../../../src/hooks/post-agent-validation/metrics.js", () => ({
    recordMetrics: vi.fn<any>(),
    archiveArtifacts: vi.fn<any>()
}));

// Mock all 9 handlers
vi.mock("../../../src/hooks/post-agent-validation/coder/handler.js", () => ({
    handleCoder: vi.fn<any>(async () => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/document/handler.js", () => ({
    handleDocument: vi.fn<any>(async () => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/domain-mapper/handler.js", () => ({
    handleModuleMapper: vi.fn<any>(async () => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/evidence-researcher/handler.js", () => ({
    handleEvidenceResearcher: vi.fn<any>(() => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/placement-gate/handler.js", () => ({
    handlePlacementGate: vi.fn<any>(() => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/plan-gate/handler.js", () => ({
    handlePlanGate: vi.fn<any>(() => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/planner/handler.js", () => ({
    handlePlanner: vi.fn<any>(() => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/reviewer/handler.js", () => ({
    handleReviewer: vi.fn<any>(() => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/simplify/handler.js", () => ({
    handleSimplify: vi.fn<any>(async () => [])
}));
vi.mock("../../../src/hooks/post-agent-validation/challenge-arbiter/handler.js", () => ({
    handleChallengeArbiter: vi.fn<any>(() => [])
}));

// Import the mocked modules so we can control their return values
import { handleCoder } from "../../../src/hooks/post-agent-validation/coder/handler.js";
import { handlePlanner } from "../../../src/hooks/post-agent-validation/planner/handler.js";
import { handleReviewer } from "../../../src/hooks/post-agent-validation/reviewer/handler.js";

function makeStopInput(overrides: Partial<SubagentStopHookInput> = {}): SubagentStopHookInput {
    return {
        hook_event_name: "SubagentStop",
        session_id: "test-session",
        transcript_path: "/tmp/transcript.json",
        cwd: "/tmp/test-project",
        agent_id: "agent-1",
        agent_type: "coder",
        agent_transcript_path: "/tmp/agent-transcript.json",
        stop_hook_active: false,
        ...overrides
    };
}

describe("createPostAgentValidationHook", () => {
    it("routes coder to coder handler", async () => {
        const hook = createPostAgentValidationHook();
        const result = await hook(makeStopInput({ agent_type: "coder" }));

        expect(handleCoder).toHaveBeenCalledWith("/tmp/test-project", expect.any(Object));
        expect(result).toEqual({ continue: true });
    });

    it("routes planner to planner handler", async () => {
        const hook = createPostAgentValidationHook();
        await hook(makeStopInput({ agent_type: "planner" }));

        expect(handlePlanner).toHaveBeenCalledWith("/tmp/test-project");
    });

    it("passes through unknown agent types", async () => {
        const hook = createPostAgentValidationHook();
        const result = await hook(makeStopInput({ agent_type: "unknown" }));

        expect(result).toEqual({ continue: true });
    });

    it("passes through non-ADLC agent types", async () => {
        const hook = createPostAgentValidationHook();
        const result = await hook(makeStopInput({ agent_type: "some-other-agent" }));

        expect(result).toEqual({ continue: true });
    });

    it("runs validation even when stop_hook_active is true", async () => {
        vi.mocked(handleCoder).mockResolvedValueOnce(["Build failed"]);

        const hook = createPostAgentValidationHook();
        const result = await hook(makeStopInput({ stop_hook_active: true, agent_type: "coder" }));

        expect(handleCoder).toHaveBeenCalled();
        expect(result.decision).toBe("block");
    });

    it("blocks when handler reports problems", async () => {
        vi.mocked(handleCoder).mockResolvedValueOnce(["Build failed: type error in src/foo.ts", "Lint: 3 errors found"]);

        const hook = createPostAgentValidationHook();
        const result = await hook(makeStopInput({ agent_type: "coder" }));

        expect(result.decision).toBe("block");
        expect(result.reason).toContain("coder post-completion checks failed");
        expect(result.reason).toContain("Build failed");
        expect(result.reason).toContain("Lint: 3 errors found");
    });

    it("allows when handler returns empty problems", async () => {
        vi.mocked(handleReviewer).mockReturnValueOnce([]);

        const hook = createPostAgentValidationHook();
        const result = await hook(makeStopInput({ agent_type: "reviewer" }));

        expect(result).toEqual({ continue: true });
    });
});
