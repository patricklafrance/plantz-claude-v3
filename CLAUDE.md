## Rules

1. Before changing a module API or architectural pattern, check `agent-docs/adr/index.md`.
2. Before changing build tooling, CI, or dev workflows, check `agent-docs/odr/index.md`.
3. Before reporting a task complete, run `git status --short`. If any changed file affects repo structure, build/CI config, module registration, package exports, or a topic in the Index below, open the matching doc and fix any line that no longer matches reality. Pure feature code within an existing module does not require a doc check. Stop after one pass.
4. Never add dependencies to the root `package.json` unless they are global workspace tools (turbo, syncpack, oxlint, tsx, cross-env, etc.). Module-specific deps belong in the `package.json` of the app or package that uses them.

## Index

### Architecture

- [ARCHITECTURE.md](agent-docs/ARCHITECTURE.md) — repo structure, package naming, Squide topology, data layer, tech stack

### References

- [references/placement.md](agent-docs/references/placement.md) — code placement, module/package responsibilities
- [references/msw-tanstack-query.md](agent-docs/references/msw-tanstack-query.md) — data layer patterns
- [references/storybook.md](agent-docs/references/storybook.md) — Storybook conventions
- [references/tailwind-postcss.md](agent-docs/references/tailwind-postcss.md) — Tailwind CSS v4
- [references/shadcn.md](agent-docs/references/shadcn.md) — shadcn/ui patterns
- [references/color-mode.md](agent-docs/references/color-mode.md) — dark mode
- [references/turborepo.md](agent-docs/references/turborepo.md) — task definitions, caching
- [references/typescript.md](agent-docs/references/typescript.md) — tsconfig, tsgo
- [references/static-analysis.md](agent-docs/references/static-analysis.md) — lint tools
- [references/agent-browser.md](agent-docs/references/agent-browser.md) — browser verification CLI
- [references/ui-ux-design.md](agent-docs/references/ui-ux-design.md) — UI/UX design thinking principles

### Decisions

- [adr/index.md](agent-docs/adr/index.md) — architectural decision log
- [odr/index.md](agent-docs/odr/index.md) — operational decision log

## Growth Conventions

- New `agent-docs/` files get an index entry above; keep this file under ~60 lines.
- Module-specific patterns belong in a scoped CLAUDE.md near the code, not here. Duplicating rules causes drift.
