/**
 * Repository preflight validation — runs at the start of every run()
 * to catch misconfiguration early with clear error messages.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const REQUIRED_SCRIPTS = [
    "build",
    "lint",
    "test",
    "typecheck",
    "lint-check",
    "lint-fix",
    "format-check",
    "format-fix",
    "knip",
    "syncpack",
    "dev-app",
    "dev-storybook"
] as const;

const REQUIRED_BINARIES = ["agent-browser"] as const;

/**
 * Validate that the consumer's repo has the required scripts, binaries,
 * and reference directory.
 * Throws on the first missing item with a clear error message.
 *
 * @param referenceDir - Absolute path to the reference docs directory.
 */
export function validateRepository(cwd: string, referenceDir: string): void {
    const pkgPath = join(cwd, "package.json");
    let pkg: { scripts?: Record<string, string>; devDependencies?: Record<string, string> };

    try {
        pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    } catch {
        throw new Error(`Cannot read ${pkgPath}. Ensure a package.json exists in the target repository root.`);
    }

    const scripts = pkg.scripts ?? {};

    for (const name of REQUIRED_SCRIPTS) {
        if (!scripts[name]) {
            throw new Error(`Missing script \`${name}\` in root package.json. The ADLC harness expects: ${REQUIRED_SCRIPTS.join(", ")}`);
        }
    }

    const devDeps = pkg.devDependencies ?? {};

    for (const name of REQUIRED_BINARIES) {
        if (!devDeps[name]) {
            throw new Error(`Missing binary \`${name}\` — install it as a devDependency in root package.json`);
        }
    }

    if (!existsSync(referenceDir)) {
        throw new Error(
            `Reference docs directory not found at \`${referenceDir}\`. Create it or set \`structure.reference\` in adlc.config.ts to point to your docs directory.`
        );
    }
}
