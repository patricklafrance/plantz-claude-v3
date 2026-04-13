/** Step 0: Gather pipeline input — text passthrough or PM tool fetch. */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

// ── Types ──────────────────────────────────────────────────

export type PipelineInput =
    | { type: "feat-text"; description: string }
    | { type: "feat-issue"; issueNumber: number }
    | { type: "fix-text"; description: string }
    | { type: "fix-pr"; prNumber: number };

interface GatherResult {
    description: string;
}

const INPUT_FILE = "input.md";
const NO_ISSUES_MARKER = "NO_ISSUES_FOUND";

// ── Step function ──────────────────────────────────────────

function buildPrompt(input: PipelineInput): string {
    switch (input.type) {
        case "feat-text":
        case "fix-text":
            return `Write the following description to input.md:\n\n${input.description}`;
        case "feat-issue":
            return `Fetch GitHub issue #${input.issueNumber} and write it to input.md.`;
        case "fix-pr":
            return `Fetch all open adlc-fix issues linked to PR #${input.prNumber} and write them to input.md.`;
    }
}

export async function runGather(
    input: PipelineInput,
    runDir: string,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<GatherResult> {
    const inputPath = resolve(runDir, INPUT_FILE);

    progress?.log("gather", input.type.includes("text") ? "Writing input from text description" : "Fetching input from GitHub");
    const { result } = await runAgent("gather", buildPrompt(input), cwd, agents, progress, hooks);

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
