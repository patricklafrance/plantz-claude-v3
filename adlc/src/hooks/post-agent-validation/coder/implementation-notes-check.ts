/** Verify that the coder wrote to .adlc/<run>/implementation-notes/ for the current slice. */

import { getRunDirName } from "../metrics.ts";

export function implementationNotesCheck(changedFiles: string[]): string[] {
    const runDirName = getRunDirName();
    const expectedDir = runDirName ? `.adlc/${runDirName}/implementation-notes/` : ".adlc/implementation-notes/";

    if (changedFiles.some(f => f.startsWith(expectedDir) && f.endsWith(".md"))) {
        return [];
    }

    return [
        `[implementation-notes] No file was created or updated in ${expectedDir}. Each slice must document its changes in its own implementation-notes file.`
    ];
}
