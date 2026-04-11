/**
 * Verify that changed component files have corresponding Storybook stories.
 *
 * Scans changed .tsx files in module src/ directories (apps/{domain}/{module}/src/)
 * and checks that a matching .stories.tsx exists on disk. Skips non-component files
 * (contexts, registrations, barrels, storybook config, mocks, tests).
 */

import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

/** Path pattern for module source files: apps/{domain}/{module}/src/... */
const MODULE_SRC_RE = /^apps\/[^/]+\/[^/]+\/src\//;

/** Files that are .tsx but not visual components. */
function isExcluded(filePath: string): boolean {
    const name = basename(filePath);

    if (name.endsWith(".stories.tsx")) {
        return true;
    }
    if (name.endsWith(".test.tsx")) {
        return true;
    }
    if (name === "index.tsx") {
        return true;
    }
    if (name.startsWith("register")) {
        return true;
    }
    if (name === "storybook.setup.tsx") {
        return true;
    }
    if (name.endsWith("Context.tsx")) {
        return true;
    }

    // Directories that never contain standalone components
    if (filePath.includes("/mocks/")) {
        return true;
    }
    if (/^apps\/[^/]+\/storybook\//.test(filePath)) {
        return true;
    }

    // Host app -- no per-component stories
    if (filePath.startsWith("apps/host/")) {
        return true;
    }

    return false;
}

export function storyCoverageCheck(cwd: string, changedFiles: string[]): string[] {
    const missing: string[] = [];

    for (const file of changedFiles) {
        if (!file.endsWith(".tsx")) {
            continue;
        }
        if (!MODULE_SRC_RE.test(file)) {
            continue;
        }
        if (isExcluded(file)) {
            continue;
        }

        const name = basename(file, ".tsx");
        const dir = dirname(file);
        const storyFile = resolve(cwd, dir, `${name}.stories.tsx`);

        if (!existsSync(storyFile)) {
            missing.push(`  ${file} → missing ${name}.stories.tsx`);
        }
    }

    if (missing.length === 0) {
        return [];
    }

    return [`[story-coverage] Component files without Storybook stories:\n${missing.join("\n")}`];
}
