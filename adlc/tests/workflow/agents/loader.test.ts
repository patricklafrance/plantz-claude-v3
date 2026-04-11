import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { resolveConfig } from "../../../src/config.js";
import { loadAgent, loadAllAgents } from "../../../src/workflow/agents.js";

describe("loadAgent", () => {
    it("returns a valid definition with expected properties", () => {
        const { name, definition } = loadAgent("coder");

        expect(name).toBe("coder");
        expect(definition.description).toBeTruthy();
        expect(definition.model).toBe("claude-opus-4-6");
        expect(definition.effort).toBe("medium");
        expect(definition.skills?.length).toBeGreaterThan(0);
        expect(definition.skills).toEqual(expect.arrayContaining([expect.stringContaining("SKILL.md")]));
        expect(definition.prompt).toBeTruthy();
        expect(definition.prompt.length).toBeGreaterThan(0);
    });

    it("resolves sonnet alias to full model ID", () => {
        const { definition } = loadAgent("explorer");

        expect(definition.model).toBe("claude-sonnet-4-6");
    });

    it("parses tools field from frontmatter", () => {
        const { definition } = loadAgent("explorer");

        expect(definition.tools).toEqual(["Read", "Glob", "Grep", "Bash", "Write"]);
    });

    it("throws for an unknown agent name", () => {
        expect(() => loadAgent("nonexistent")).toThrow(/Unknown agent/);
    });
});

describe("loadAllAgents", () => {
    it("every agent has a non-empty prompt, description, and model", () => {
        const agents = loadAllAgents();

        expect(Object.keys(agents).length).toBeGreaterThan(0);

        for (const [name, def] of Object.entries(agents)) {
            expect(def.prompt, `${name} should have a prompt`).toBeTruthy();
            expect(def.prompt.length, `${name} prompt should be non-empty`).toBeGreaterThan(0);
            expect(def.description, `${name} should have a description`).toBeTruthy();
            expect(def.model, `${name} should have a model`).toBeTruthy();
        }
    });

    it("prepends preamble to every agent's prompt when provided", () => {
        const preamble = "## Project context\n\nTest preamble";
        const agents = loadAllAgents(preamble);

        for (const [name, def] of Object.entries(agents)) {
            expect(def.prompt, `${name} should start with preamble`).toMatch(/^## Project context/);
            expect(def.prompt, `${name} should contain separator`).toContain("---");
        }
    });

    it("does not prepend preamble when omitted", () => {
        const agents = loadAllAgents();
        const coder = agents["coder"];

        expect(coder.prompt).not.toMatch(/^## Project context/);
    });

    it("appends consumer skills from config to bundled skills", () => {
        const cwd = "/repo";
        const config = resolveConfig({
            agents: {
                coder: { skills: ["accessibility"] },
                reviewer: { skills: ["custom-review"] }
            }
        });
        const agents = loadAllAgents(undefined, config, cwd);
        const baseAgents = loadAllAgents();

        // Consumer skills are appended to the bundled skills
        const coderSkills = agents["coder"].skills!;
        expect(coderSkills.length).toBe(baseAgents["coder"].skills!.length + 1);
        expect(coderSkills.at(-1)).toBe(join("/repo", ".claude", "skills", "accessibility", "SKILL.md"));

        const reviewerSkills = agents["reviewer"].skills!;
        expect(reviewerSkills.length).toBe(baseAgents["reviewer"].skills!.length + 1);
        expect(reviewerSkills.at(-1)).toBe(join("/repo", ".claude", "skills", "custom-review", "SKILL.md"));
    });

    it("does not modify skills when config has no agent overrides", () => {
        const config = resolveConfig({});
        const agents = loadAllAgents(undefined, config, "/repo");
        const baseAgents = loadAllAgents();

        expect(agents["coder"].skills).toEqual(baseAgents["coder"].skills);
    });
});
