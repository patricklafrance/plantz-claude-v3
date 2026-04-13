/** Step 0: Gather pipeline input — text passthrough or PM tool fetch. */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

// ── Types ──────────────────────────────────────────────────

export type PipelineInput =
    | { type: "feat-text"; description: string }
    | { type: "feat-issue"; issueNumber: number }
    | { type: "fix-text"; prNumber: number; description: string }
    | { type: "fix-pr"; prNumber: number };

export interface GatherResult {
    description: string;
}

const INPUT_FILE = "input.md";
const NO_ISSUES_MARKER = "NO_ISSUES_FOUND";

// ── Step function ──────────────────────────────────────────

export async function runGather(
    input: PipelineInput,
    runDir: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<GatherResult> {
    const inputPath = resolve(runDir, INPUT_FILE);

    // Text modes — deterministic write, no agent needed.
    if (input.type === "feat-text" || input.type === "fix-text") {
        progress?.log("gather", "Writing input from text description");
        writeFileSync(inputPath, input.description, "utf-8");

        return { description: input.description };
    }

    // GitHub modes — invoke the gather agent.
    let prompt: string;

    if (input.type === "feat-issue") {
        prompt = `Mode: feat-issue\n\nFetch GitHub issue #${input.issueNumber} and write it to input.md.`;
    } else {
        prompt = `Mode: fix-pr\n\nFetch all open adlc-fix issues linked to PR #${input.prNumber} and write them to input.md.`;
    }

    progress?.log("gather", "Fetching input from GitHub");
    const { result } = await runAgent("gather", prompt, cwd, agents, progress, hooks);

    // Handle "no issues found" for fix-pr mode.
    if (input.type === "fix-pr" && result.includes(NO_ISSUES_MARKER)) {
        throw new Error(`No open adlc-fix issues found linked to PR #${input.prNumber}`);
    }

    // Read the file written by the agent.
    if (!existsSync(inputPath)) {
        throw new Error(`Gather agent did not write ${INPUT_FILE} — check agent logs for details`);
    }

    const description = readFileSync(inputPath, "utf-8");

    return { description };
}
