/**
 * The domain-mapper must produce .adlc/domain-mapping.md.
 */

import { hasFile } from "../utils.js";

export function mappingFileCheck(cwd: string): string[] {
    if (hasFile(cwd, "domain-mapping.md")) {
        return [];
    }

    return [
        "Missing deliverable: `.adlc/domain-mapping.md` was not created. The domain-mapper must produce a mapping file before planning can begin."
    ];
}
