/** Verify that every slice has a Reference Packages section. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { listFiles } from "../utils.js";

/** True when the content contains a `## Reference Packages` heading. */
function hasReferencePackages(content: string): boolean {
    return /^## Reference Packages\s*$/m.test(content);
}

export function sliceReferencePackagesCheck(cwd: string): string[] {
    const sliceFilesCheck = listFiles(cwd, "slices", ".md");
    const slicesDir = resolve(cwd, ".adlc", "slices");
    const missing: string[] = [];

    for (const file of sliceFilesCheck) {
        try {
            const content = readFileSync(resolve(slicesDir, file), "utf8");
            if (!hasReferencePackages(content)) {
                missing.push(file);
            }
        } catch {
            // Can't read -- skip
        }
    }

    if (missing.length === 0) {
        return [];
    }

    return [
        [
            "Slices missing `## Reference Packages` section: the explorer agent needs this section to survey patterns for the coder.",
            "",
            "Missing section:",
            ...missing.map(f => `  - ${f}`)
        ].join("\n")
    ];
}
