import { copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

/**
 * Find a file by checking the ADLC run dir first, then falling back to the
 * worktree root. Agents sometimes write to the wrong location.
 */
function findFile(filename: string, wtRunDir: string, worktreePath: string): string | null {
    const primary = join(wtRunDir, filename);
    if (existsSync(primary)) {
        return primary;
    }

    const fallback = join(worktreePath, filename);
    if (existsSync(fallback)) {
        return fallback;
    }

    return null;
}

/** Copy implementation-notes, verification-results, and explorer-notes from a worktree back to the main run dir. */
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

    // Copy verification-results.md → verification-results/{sliceName}.md
    const resultsFile = findFile("verification-results.md", wtRunDir, worktreePath);
    if (resultsFile) {
        const destDir = join(mainRunDir, "verification-results");
        mkdirSync(destDir, { recursive: true });
        copyFileSync(resultsFile, join(destDir, `${sliceName}.md`));
    }

    // Reconcile stale per-slice results with a misplaced flat file.
    // When a slice goes through revision cycles, the revision reviewer sometimes
    // writes verification-results.md to the main run dir instead of the worktree.
    // Only reconcile if the worktree didn't already provide a file — otherwise
    // the flat file likely belongs to a different slice running in parallel.
    if (!resultsFile) {
        reconcileVerificationResults(mainRunDir, sliceName);
    }

    // Copy explorer summary → explorer-notes/{sliceName}.md
    const explorerFile = findFile("current-explorer-summary.md", wtRunDir, worktreePath);
    if (explorerFile) {
        const destDir = join(mainRunDir, "explorer-notes");
        mkdirSync(destDir, { recursive: true });
        copyFileSync(explorerFile, join(destDir, `${sliceName}.md`));
    }
}

/**
 * If a flat `verification-results.md` exists in the main run dir, a revision
 * reviewer likely wrote it there instead of in the worktree. Overwrite the
 * per-slice file with the flat file (which is the freshest result) and remove
 * the flat file so it doesn't contaminate future slice collections.
 */
function reconcileVerificationResults(mainRunDir: string, sliceName: string): void {
    const flatFile = join(mainRunDir, "verification-results.md");
    if (!existsSync(flatFile)) {
        return;
    }

    const destDir = join(mainRunDir, "verification-results");
    mkdirSync(destDir, { recursive: true });
    copyFileSync(flatFile, join(destDir, `${sliceName}.md`));
    unlinkSync(flatFile);
}
