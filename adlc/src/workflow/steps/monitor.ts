/** Step 7: Monitor CI and fix failures. */

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runMonitor(cwd: string, agents: Record<string, AgentDefinition>, progress?: Progress, hooks?: SDKHooks): Promise<void> {
    progress?.log("post", "Monitoring CI...");
    await runAgent("monitor", "Monitor CI and fix failures.", cwd, agents, progress, hooks);
}
