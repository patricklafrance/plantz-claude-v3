import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import { generatePackageMap } from "./package-map.ts";

export interface SliceContext {
    runDirName: string;
    planHeaderPath: string;
    domainMappingPath: string;
    slicesDir: string;
    sliceFilename: string;
    priorImplementationNotes: string[];
}

/** Seed `.adlc/<runDirName>/` directory in a worktree with plan artifacts. */
export async function seedAdlc(worktreePath: string, context: SliceContext): Promise<void> {
    const runDir = resolve(worktreePath, ".adlc", context.runDirName);
    const slicesDir = join(runDir, "slices");
    const implNotesDir = join(runDir, "implementation-notes");

    // Create directory structure
    mkdirSync(runDir, { recursive: true });
    mkdirSync(slicesDir, { recursive: true });
    mkdirSync(implNotesDir, { recursive: true });

    // Copy plan-header.md and domain-mapping.md into the run dir
    copyFileSync(context.planHeaderPath, join(runDir, "plan-header.md"));
    copyFileSync(context.domainMappingPath, join(runDir, "domain-mapping.md"));

    // Copy ALL slice files from slicesDir into run dir slices/
    const sliceFiles = readdirSync(context.slicesDir);
    for (const file of sliceFiles) {
        copyFileSync(join(context.slicesDir, file), join(slicesDir, file));
    }

    // Copy the current slice as current-slice.md in the run dir
    copyFileSync(join(context.slicesDir, context.sliceFilename), join(runDir, "current-slice.md"));

    // Copy prior implementation notes
    for (const notePath of context.priorImplementationNotes) {
        const filename = basename(notePath);
        copyFileSync(notePath, join(implNotesDir, filename));
    }

    // Generate the package map from the current slice's reference packages.
    // Runs against the worktree's filesystem so it reflects prior slice changes.
    generatePackageMap(worktreePath, context.runDirName);
}
