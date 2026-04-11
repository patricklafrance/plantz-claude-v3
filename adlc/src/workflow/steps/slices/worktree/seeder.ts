import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export interface SliceContext {
    planHeaderPath: string;
    domainMappingPath: string;
    slicesDir: string;
    sliceFilename: string;
    priorImplementationNotes: string[];
}

/** Seed `.adlc/` directory in a worktree with plan artifacts. */
export async function seedAdlc(worktreePath: string, context: SliceContext): Promise<void> {
    const adlcRoot = resolve(worktreePath, ".adlc");
    const slicesDir = join(adlcRoot, "slices");
    const implNotesDir = join(adlcRoot, "implementation-notes");

    // Create directory structure
    mkdirSync(adlcRoot, { recursive: true });
    mkdirSync(slicesDir, { recursive: true });
    mkdirSync(implNotesDir, { recursive: true });

    // Copy plan-header.md and domain-mapping.md into .adlc/
    copyFileSync(context.planHeaderPath, join(adlcRoot, "plan-header.md"));
    copyFileSync(context.domainMappingPath, join(adlcRoot, "domain-mapping.md"));

    // Copy ALL slice files from slicesDir into .adlc/slices/
    const sliceFiles = readdirSync(context.slicesDir);
    for (const file of sliceFiles) {
        copyFileSync(join(context.slicesDir, file), join(slicesDir, file));
    }

    // Copy the current slice as .adlc/current-slice.md
    copyFileSync(join(context.slicesDir, context.sliceFilename), join(adlcRoot, "current-slice.md"));

    // Copy prior implementation notes
    for (const notePath of context.priorImplementationNotes) {
        const filename = basename(notePath);
        copyFileSync(notePath, join(implNotesDir, filename));
    }
}
