/** Verify that the coder wrote to .adlc/implementation-notes/ for the current slice. */

const EXPECTED_DIR = ".adlc/implementation-notes/";

export function implementationNotesCheck(changedFiles: string[]): string[] {
    if (changedFiles.some(f => f.startsWith(EXPECTED_DIR) && f.endsWith(".md"))) {
        return [];
    }

    return [
        `[implementation-notes] No file was created or updated in ${EXPECTED_DIR}. Each slice must document its changes in its own implementation-notes file.`
    ];
}
