/** Per-slice: coordinator orchestrates explorer -> coder <-> reviewer. */

import type { ResolvedConfig } from "../../../config.ts";
import { createHooks } from "../../../hooks/create-hooks.ts";
import { getRunDirName } from "../../../hooks/post-agent-validation/metrics.ts";
import type { Progress } from "../../../progress.ts";
import { loadAllAgents, runAgent } from "../../agents.ts";

export async function runSlicePipeline(
    sliceName: string,
    worktreePath: string,
    preamble: string,
    config: ResolvedConfig,
    cwd: string,
    progress?: Progress,
    coordinatorAgent = "feature-slice-coordinator"
): Promise<{ success: boolean; reason?: string }> {
    const agents = loadAllAgents(preamble, config, cwd, getRunDirName()!);
    const { hooks } = createHooks({ cwd: worktreePath });

    progress?.slice(sliceName, "coordinator", "starting slice pipeline");

    const { result } = await runAgent(
        coordinatorAgent,
        `Implement and verify slice: ${sliceName}`,
        worktreePath,
        agents,
        progress,
        hooks,
        undefined,
        { AGENT_BROWSER_SESSION: sliceName }
    );

    // The coordinator completed without SDK error, and all sub-agent validation
    // hooks ran during execution. Only mark as failure if the coordinator explicitly
    // reported exhausting its retry budget or returned no result.
    const failed = !result || result.toLowerCase().includes("max revision attempts exceeded");
    if (failed) {
        progress?.slice(sliceName, "coordinator", "slice failed");
        return { success: false, reason: result || "coordinator reported failure" };
    }

    progress?.slice(sliceName, "coordinator", "slice passed");
    return { success: true };
}
