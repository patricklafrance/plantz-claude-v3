/**
 * Shared helpers for PreToolUse tool guardrails.
 */

const SEGMENT_SPLIT = /\s*(?:&&|\|\||\||;)\s*/;

export function splitCommandSegments(command: string | null | undefined): string[] {
    return String(command ?? "")
        .split(SEGMENT_SPLIT)
        .map(segment => segment.trim())
        .filter(Boolean);
}

export function pathIncludesNodeModules(path: string): boolean {
    return /(^|[\\/])node_modules([\\/]|$)/.test(path);
}
