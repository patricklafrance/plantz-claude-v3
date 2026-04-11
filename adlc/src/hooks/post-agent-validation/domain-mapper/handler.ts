/**
 * domain-mapper handler
 *
 * Checks:
 *   1. mapping-file     -- .adlc/domain-mapping.md exists
 *   2. engagement-check  -- after challenge-revision, verifies mapper engaged with challenges
 */

import { engagementCheck } from "./engagement-check.ts";
import { mappingFileCheck } from "./mapping-file-check.ts";

export function handleModuleMapper(cwd: string): string[] {
    return [...mappingFileCheck(cwd), ...engagementCheck(cwd)];
}
