import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES_DIR = dirname(fileURLToPath(import.meta.url));
const cache = new Map<string, string>();

/**
 * Read a fixture file by agent and filename.
 * Results are cached in-process to avoid redundant I/O across tests.
 */
export function loadFixture(agent: string, name: string): string {
    const key = `${agent}/${name}`;
    if (!cache.has(key)) {
        cache.set(key, readFileSync(resolve(FIXTURES_DIR, agent, name), "utf8"));
    }
    return cache.get(key)!;
}
