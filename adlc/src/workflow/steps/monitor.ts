/** Step 7: Monitor CI and fix failures. */

import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runMonitor(cwd: string, agents: Record<string, AgentDefinition>, progress?: Progress): Promise<void> {
    progress?.log("post", "Monitoring CI...");
    await runAgent("monitor", "Monitor CI and fix failures.", cwd, agents);
}
