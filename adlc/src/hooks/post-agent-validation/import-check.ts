/**
 * Architectural layering enforcement for changed files.
 *
 * ┌────────────────────┬─────────────────────────────────┬──────────────────────────────┐
 * │ Layer              │ May import from                 │ Blocked                      │
 * ├────────────────────┼─────────────────────────────────┼──────────────────────────────┤
 * │ @apps/host         │ @modules/*, @packages/*         │ @apps/*                      │
 * │ @modules/*         │ @packages/* only                │ @modules/* (cross), @apps/*  │
 * │ @apps/*-storybook  │ @packages/* only                │ @modules/*, @apps/*          │
 * │ @packages/*        │ @packages/* only                │ @modules/*, @apps/*          │
 * └────────────────────┴─────────────────────────────────┴──────────────────────────────┘
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

interface FileClassification {
    layer: string | null;
    context: string | null;
}

/** Determine the architectural layer and package identity from a repo-relative path. */
function classifyFile(filePath: string): FileClassification {
    if (filePath.startsWith("apps/host/")) {
        return { layer: "host", context: "@apps/host" };
    }
    if (filePath.startsWith("apps/storybook/")) {
        return { layer: "storybook", context: "@apps/storybook" };
    }
    const sbMatch = filePath.match(/^apps\/([^/]+)\/storybook\//);
    if (sbMatch) {
        return { layer: "storybook", context: `@apps/${sbMatch[1]}-storybook` };
    }
    const modMatch = filePath.match(/^apps\/([^/]+)\/([^/]+)\//);
    if (modMatch) {
        return { layer: "module", context: `@modules/${modMatch[1]}-${modMatch[2]}` };
    }
    const pkgMatch = filePath.match(/^packages\/([^/]+)\//);
    if (pkgMatch) {
        return { layer: "package", context: `@packages/${pkgMatch[1]}` };
    }
    return { layer: null, context: null };
}

/** Returns a violation message or null. */
function checkLayerViolation(layer: string, context: string, ref: string): string | null {
    switch (layer) {
        case "host":
            if (ref.startsWith("@apps/")) {
                return "host cannot import @apps/*";
            }
            break;
        case "module":
            if (ref.startsWith("@apps/")) {
                return "modules cannot import @apps/*";
            }
            if (ref.startsWith("@modules/") && ref !== context) {
                return "modules cannot import other modules";
            }
            break;
        case "storybook":
            if (ref.startsWith("@modules/")) {
                return "storybooks cannot import @modules/*";
            }
            if (ref.startsWith("@apps/")) {
                return "storybooks cannot import @apps/*";
            }
            break;
        case "package":
            if (ref.startsWith("@modules/")) {
                return "packages cannot import @modules/*";
            }
            if (ref.startsWith("@apps/")) {
                return "packages cannot import @apps/*";
            }
            break;
    }
    return null;
}

/** Scan changed .ts/.tsx files for cross-boundary import violations. */
export function crossBoundaryImportsCheck(cwd: string, changedFiles: string[]): string[] {
    const violations: string[] = [];
    for (const file of changedFiles) {
        if (!/\.(ts|tsx)$/.test(file)) {
            continue;
        }
        const abs = resolve(cwd, file);
        if (!existsSync(abs)) {
            continue;
        }

        const { layer, context } = classifyFile(file);
        if (!layer) {
            continue;
        }

        const content = readFileSync(abs, "utf8");
        const refs = [...new Set(content.match(/@(?:modules|apps)\/[a-z0-9-]+/g) || [])];

        for (const ref of refs) {
            const violation = checkLayerViolation(layer, context!, ref);
            if (violation) {
                violations.push(`  ${file}: ${context} → ${ref} (${violation})`);
            }
        }
    }
    if (violations.length === 0) {
        return [];
    }
    return [`[imports] Cross-boundary import violations:\n${violations.join("\n")}`];
}
