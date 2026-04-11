/**
 * Install the Playwright Chromium browser for Storybook vitest/a11y testing.
 *
 * Finds the first storybook workspace that has playwright and installs
 * chromium from there. All storybooks share the same playwright version
 * so a single install is sufficient.
 *
 * Usage:  pnpm install-playwright
 */

import { execSync } from "node:child_process";

const result = execSync('pnpm -r --filter "*storybook*" list playwright --json --depth=0', {
    encoding: "utf-8"
});

const workspaces = JSON.parse(result) as { name: string }[];
const first = workspaces.find(ws => ws.name);

if (!first) {
    throw new Error("No storybook workspace with playwright found.");
}

execSync(`pnpm --filter ${first.name} exec playwright install chromium`, {
    stdio: "inherit"
});
