/** Step 5: Update documentation. */

import type { Progress } from "../../progress.ts";
import { type AgentDefinition, runAgent } from "../agents.ts";

export async function runDocument(cwd: string, agents: Record<string, AgentDefinition>, progress?: Progress): Promise<void> {
    progress?.log("post", "Updating documentation...");
    await runAgent("document", "Update documentation.", cwd, agents);
}
