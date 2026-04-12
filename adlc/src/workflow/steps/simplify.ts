/** Step 4: Simplify and clean up the implementation. */

import type { SDKHooks } from "../../hooks/create-hooks.ts";
import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runSimplify(cwd: string, agents: Record<string, AgentDefinition>, progress?: Progress, hooks?: SDKHooks): Promise<void> {
    progress?.log("post", "Running simplify pass...");
    await runAgent("simplify", "Review and simplify the implementation.", cwd, agents, progress, hooks);
}
