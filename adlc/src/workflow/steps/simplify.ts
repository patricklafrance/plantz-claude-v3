/** Step 4: Simplify and clean up the implementation. */

import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runSimplify(cwd: string, agents: Record<string, AgentDefinition>, progress?: Progress): Promise<void> {
    progress?.log("post", "Running simplify pass...");
    await runAgent("simplify", "Review and simplify the implementation.", cwd, agents);
}
