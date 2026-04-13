import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { Ports } from "./ports.ts";

// ── Model resolution ─────────────────────────────────────

/** Model aliases → full model IDs. */
const MODEL_IDS = {
    sonnet: "claude-sonnet-4-6",
    opus: "claude-opus-4-6",
    haiku: "claude-haiku-4-5-20251001"
} as const;

/** Resolve a model alias or full ID. */
export function resolveModel(alias: string | undefined): string | undefined {
    if (!alias) {
        return undefined;
    }
    return MODEL_IDS[alias as keyof typeof MODEL_IDS] ?? alias;
}

// ── Orchestrator defaults ────────────────────────────────

/** Default orchestrator settings. */
export const DEFAULTS = {
    /** Max USD budget per slice. */
    budgetPerSlice: 15,
    /** Max parallel slices per wave. */
    maxParallel: 5
} as const;

/** Port allocation base for parallel worktrees. */
const PORT_BASE = {
    storybook: 6100,
    hostApp: 8100,
    browser: 9200
} as const;

// ── ADLC config types ────────────────────────────────────

export interface AdlcConfig {
    structure?: {
        apps?: string;
        hostApp?: string;
        modules?: string;
        packages?: string;
        reference?: string;
    };
    scaffolding?: {
        packageMeta?: {
            license?: string;
            author?: string;
        };
        referenceModule?: string;
        referenceStorybook?: string;
    };
    ports?: {
        storybook?: number;
        hostApp?: number;
        browser?: number;
    };
    /** Per-agent overrides, keyed by agent name. */
    agents?: Record<
        string,
        {
            /** Extra skill names to inject (e.g., `"accessibility"`). Resolved to `.claude/skills/{name}/SKILL.md`. */
            skills?: string[];
        }
    >;
}

export interface ResolvedConfig {
    structure: {
        apps: string;
        hostApp: string;
        modules: string;
        packages: string;
        reference: string;
    };
    scaffolding: {
        packageMeta: {
            license: string;
            author?: string;
        };
        referenceModule?: string;
        referenceStorybook?: string;
    };
    ports: Ports;
    /** Per-agent overrides, keyed by agent name. */
    agents: Record<
        string,
        {
            skills: string[];
        }
    >;
}

/** Identity helper for type-safe config files. */
export function defineConfig(config: AdlcConfig): AdlcConfig {
    return config;
}

/** Merge a partial config with all defaults. */
export function resolveConfig(partial: AdlcConfig): ResolvedConfig {
    return {
        structure: {
            apps: partial.structure?.apps ?? "./apps",
            hostApp: partial.structure?.hostApp ?? "host",
            modules: partial.structure?.modules ?? "./modules",
            packages: partial.structure?.packages ?? "./packages",
            reference: partial.structure?.reference ?? "./agent-docs"
        },
        scaffolding: {
            packageMeta: {
                license: partial.scaffolding?.packageMeta?.license ?? "Apache-2.0",
                author: partial.scaffolding?.packageMeta?.author
            },
            referenceModule: partial.scaffolding?.referenceModule,
            referenceStorybook: partial.scaffolding?.referenceStorybook
        },
        ports: {
            storybook: partial.ports?.storybook ?? PORT_BASE.storybook,
            hostApp: partial.ports?.hostApp ?? PORT_BASE.hostApp,
            browser: partial.ports?.browser ?? PORT_BASE.browser
        },
        agents: Object.fromEntries(Object.entries(partial.agents ?? {}).map(([name, agent]) => [name, { skills: agent.skills ?? [] }]))
    };
}

/** Config file names to search for, in priority order. */
const CONFIG_FILES = ["adlc.config.ts", "adlc.config.js", "adlc.config.mjs"] as const;

/** Find and load `adlc.config.{ts,js,mjs}`, or return `{}` if none exists. */
export async function loadConfig(cwd?: string): Promise<AdlcConfig> {
    const dir = cwd ?? process.cwd();

    for (const name of CONFIG_FILES) {
        const filePath = resolve(dir, name);

        if (!existsSync(filePath)) {
            continue;
        }

        // Use file:// URL for cross-platform dynamic import compatibility.
        const moduleUrl = pathToFileURL(filePath).href;
        // eslint-disable-next-line no-await-in-loop
        const mod = (await import(moduleUrl)) as { default?: AdlcConfig };

        return mod.default ?? {};
    }

    return {};
}
