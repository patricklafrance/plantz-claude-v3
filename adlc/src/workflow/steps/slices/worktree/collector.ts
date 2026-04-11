import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Copy implementation-notes and verification-results from a worktree's .adlc/ back to the main .adlc/. */
export async function collectResults(worktreePath: string, mainAdlcPath: string, sliceName: string): Promise<void> {
    // Copy implementation-notes directory (multiple files)
    const notesDir = join(worktreePath, ".adlc", "implementation-notes");
    if (existsSync(notesDir)) {
        const destDir = join(mainAdlcPath, "implementation-notes");
        mkdirSync(destDir, { recursive: true });

        const files = readdirSync(notesDir);
        for (const file of files) {
            copyFileSync(join(notesDir, file), join(destDir, file));
        }
    }

    // Copy verification-results.md file → verification-results/{sliceName}.md
    const resultsFile = join(worktreePath, ".adlc", "verification-results.md");
    if (existsSync(resultsFile)) {
        const destDir = join(mainAdlcPath, "verification-results");
        mkdirSync(destDir, { recursive: true });
        copyFileSync(resultsFile, join(destDir, `${sliceName}.md`));
    }
}
