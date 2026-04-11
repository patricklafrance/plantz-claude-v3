# ODR-0001: pnpm Workspaces with Turborepo

## Status

accepted

## Context

plantz-claude is a monorepo with multiple apps and packages. It needs a package manager that enforces dependency isolation and a task orchestrator that provides caching and parallelism.

## Options Considered

1. **pnpm + Turborepo** — pnpm for strict dependency isolation (no phantom deps), Turborepo for task scheduling with content-aware caching and `--filter` for affected-package detection.
2. **npm + Nx** — npm workspaces with Nx for task orchestration. npm's flat node_modules allows phantom dependencies. Nx is more feature-rich but heavier.
3. **pnpm + Nx** — Combines pnpm's strict isolation with Nx's orchestration. Viable but adds complexity over Turborepo for a project of this size.
4. **pnpm alone** — pnpm workspaces with `--filter` for running scripts. No task caching or dependency-graph-aware parallelism.

## Decision

Use pnpm workspaces with Turborepo (Option 1). pnpm provides strict dependency isolation, and Turborepo provides lightweight task scheduling with caching. The combination is well-suited to the project's scale.

## Consequences

- Task definitions live in `turbo.json` with explicit dependency graphs (`dependsOn`).
- `--filter` enables running tasks on affected packages only (used in CI for build and typecheck).
- `turbo ls` can be used programmatically (e.g., in `get-affected-storybooks.ts`).
- Workspace topology is defined in `pnpm-workspace.yaml` (`apps/**`, `packages/**`).
- The `.turbo` directory holds the local cache and is gitignored.
