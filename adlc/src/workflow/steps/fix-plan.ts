/** Step 2 (fix mode): Collect issues and generate fix slices via fix-planner agent. */

import { execSync } from "node:child_process";

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import type { FixTarget } from "../orchestrator.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

interface PrMetadata {
    headRefName: string;
    number: number;
    body: string;
    url: string;
}

interface GitHubIssue {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
}

/**
 * Collect open `adlc-fix` issues linked to a PR and return a FixTarget.
 * Called from the CLI before entering the orchestrator.
 */
export function collectFixIssues(prNumber: number, cwd: string): FixTarget {
    // Get PR metadata
    const prRaw = execSync(
        `gh pr view ${prNumber} --json headRefName,number,body,url`,
        { cwd, encoding: "utf8" }
    );
    const pr = JSON.parse(prRaw) as PrMetadata;

    // Collect all open issues with the adlc-fix label
    const issuesRaw = execSync(
        "gh issue list --label adlc-fix --state open --json number,title,body,labels",
        { cwd, encoding: "utf8" }
    );
    const allIssues = JSON.parse(issuesRaw) as GitHubIssue[];

    // Filter to issues linked to this PR (body contains PR reference)
    const prRef = `#${prNumber}`;
    const prUrl = pr.url;
    const linkedIssues = allIssues.filter(issue =>
        issue.body.includes(prRef) || issue.body.includes(prUrl)
    );

    if (linkedIssues.length === 0) {
        throw new Error(`No open adlc-fix issues found linked to PR #${prNumber}`);
    }

    return {
        prNumber,
        branch: pr.headRefName,
        issues: linkedIssues.map(i => ({ number: i.number, title: i.title, body: i.body }))
    };
}

/**
 * Run the fix-planner agent to generate one fix slice per issue.
 */
export async function runFixPlan(
    fix: FixTarget,
    cwd: string,
    agents: Record<string, AgentDefinition>,
    progress?: Progress,
    hooks?: SDKHooks
): Promise<void> {
    const issueList = fix.issues
        .map(i => `- Issue #${i.number}: ${i.title}\n  ${i.body}`)
        .join("\n\n");

    const prompt = [
        `Generate fix slices for PR #${fix.prNumber}.`,
        "",
        "Issues to fix:",
        issueList
    ].join("\n");

    progress?.log("plan", "Starting fix planner");
    await runAgent("fix-planner", prompt, cwd, agents, progress, hooks);
    progress?.log("plan", "Fix plan complete");
}
