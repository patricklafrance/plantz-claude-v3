import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Copy implementation-notes and verification-results from a worktree's run dir back to the main run dir. */
export async function collectResults(worktreePath: string, mainRunDir: string, sliceName: string, runDirName: string): Promise<void> {
    const wtRunDir = join(worktreePath, ".adlc", runDirName);

    // Copy implementation-notes directory (multiple files)
    const notesDir = join(wtRunDir, "implementation-notes");
    if (existsSync(notesDir)) {
        const destDir = join(mainRunDir, "implementation-notes");
        mkdirSync(destDir, { recursive: true });

        const files = readdirSync(notesDir);
        for (const file of files) {
            copyFileSync(join(notesDir, file), join(destDir, file));
        }
    }

    // Copy verification-results.md file → verification-results/{sliceName}.md
    const resultsFile = join(wtRunDir, "verification-results.md");
    if (existsSync(resultsFile)) {
        const destDir = join(mainRunDir, "verification-results");
        mkdirSync(destDir, { recursive: true });
        copyFileSync(resultsFile, join(destDir, `${sliceName}.md`));
    }
}
