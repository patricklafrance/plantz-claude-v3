/** Per-slice: explorer -> coder <-> reviewer retry logic. */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { query } from "@anthropic-ai/claude-agent-sdk";

import { DEFAULTS, type ResolvedConfig } from "../../../config.ts";
import { createHooks } from "../../../hooks/create-hooks.ts";
import type { Ports } from "../../../ports.ts";
import type { Progress } from "../../../progress.ts";
import type { AgentDefinition } from "../../agents.ts";
import { loadAllAgents } from "../../agents.ts";

/** Hooks record shape returned by createHooks. */
type SDKHooks = ReturnType<typeof createHooks>["hooks"];

/** Run an agent in a worktree with hooks. Returns the session ID. */
async function runAgentInWorktree(
    agentName: string,
    prompt: string,
    worktreePath: string,
    agents: Record<string, AgentDefinition>,
    hooks: SDKHooks,
    ports: Ports,
    resumeSessionId?: string
): Promise<{ result: string; sessionId: string }> {
    const conversation = query({
        prompt,
        options: {
            agent: agentName,
            agents,
            cwd: worktreePath,
            settingSources: ["project"],
            permissionMode: "bypassPermissions",
            allowDangerouslySkipPermissions: true,
            hooks,
            persistSession: true,
            env: {
                STORYBOOK_PORT: String(ports.storybook),
                HOST_APP_PORT: String(ports.hostApp),
                BROWSER_PORT: String(ports.browser)
            },
            ...(resumeSessionId ? { resume: resumeSessionId } : {})
        }
    });

    let result = "";
    let sessionId = "";
    for await (const message of conversation) {
        if (message.type === "result") {
            if (message.subtype === "success") {
                result = message.result;
                sessionId = message.session_id;
            } else {
                const msg = message as Record<string, unknown>;
                const errors = Array.isArray(msg.errors) ? (msg.errors as string[]).join("; ") : String(msg.subtype);
                throw new Error(`Agent "${agentName}" failed (${msg.subtype}): ${errors}`);
            }
        }
    }
    return { result, sessionId };
}

/** Run the coder agent. Resumes a previous session for revision passes. */
async function runCoderPass(
    mode: "draft" | "revision",
    sliceName: string,
    worktreePath: string,
    agents: Record<string, AgentDefinition>,
    hooks: SDKHooks,
    ports: Ports,
    previousSessionId?: string
): Promise<string> {
    const prompt = mode === "draft" ? `Implement slice: ${sliceName}` : "Apply the reviewer feedback and fix the identified issues.";

    const { sessionId } = await runAgentInWorktree(
        "coder",
        prompt,
        worktreePath,
        agents,
        hooks,
        ports,
        mode === "revision" ? previousSessionId : undefined
    );

    return sessionId;
}

/** Check whether the reviewer's verification results indicate a pass. */
export function checkVerificationResults(worktreePath: string): boolean {
    const resultsPath = resolve(worktreePath, ".adlc/verification-results.md");
    if (!existsSync(resultsPath)) {
        return false;
    }

    const content = readFileSync(resultsPath, "utf-8").toLowerCase();

    // A pass means no "failed" criteria in the results
    return !content.includes("failed") && !content.includes("fail");
}

export async function runSlicePipeline(
    sliceName: string,
    worktreePath: string,
    ports: Ports,
    preamble: string,
    config: ResolvedConfig,
    cwd: string,
    progress?: Progress
): Promise<{ success: boolean; reason?: string }> {
    const agents = loadAllAgents(preamble, config, cwd);
    const { hooks } = createHooks({ cwd: worktreePath });

    // Explorer phase
    progress?.slice(sliceName, "explorer", "surveying reference packages");
    await runAgentInWorktree("explorer", "Survey reference packages for this slice.", worktreePath, agents, hooks, ports);

    // Coder <-> Reviewer loop
    let coderSessionId: string | undefined;
    for (let attempt = 0; attempt < DEFAULTS.maxRevisionAttempts; attempt++) {
        const mode = attempt === 0 ? ("draft" as const) : ("revision" as const);

        // Coder (resume session for revisions)
        progress?.slice(sliceName, "coder", `${mode} attempt ${attempt + 1}/${DEFAULTS.maxRevisionAttempts}`);
        // eslint-disable-next-line no-await-in-loop
        coderSessionId = await runCoderPass(mode, sliceName, worktreePath, agents, hooks, ports, coderSessionId);

        // Reviewer (fresh session each time for adversarial independence)
        progress?.slice(sliceName, "reviewer", `verifying attempt ${attempt + 1}`);
        // eslint-disable-next-line no-await-in-loop
        await runAgentInWorktree("reviewer", "Verify the slice implementation.", worktreePath, agents, hooks, ports);

        // Check verification results
        const passed = checkVerificationResults(worktreePath);
        if (passed) {
            progress?.slice(sliceName, "reviewer", "passed");
            return { success: true };
        }

        progress?.slice(sliceName, "reviewer", "failed, requesting revision");
    }

    return { success: false, reason: "max revision attempts exceeded" };
}
