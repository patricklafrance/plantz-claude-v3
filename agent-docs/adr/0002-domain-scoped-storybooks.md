# ADR-0002: Module-Scoped Storybooks

## Status

accepted

## Context

Multiple modules (management, watering) and a shared packages layer each need visual component development and regression testing. A single global Storybook would couple all modules' build times and Chromatic snapshot costs together.

## Options Considered

1. **Per-module Storybooks** — Each module and the shared packages layer gets its own Storybook instance. Independent build times, targeted Chromatic costs, and affected-detection per module.
2. **Single global Storybook** — One Storybook importing stories from all modules. Simpler configuration but longer build times, higher Chromatic costs, and no way to skip unaffected modules.

## Decision

Use per-module Storybooks (Option 1). Each module has a Storybook at `apps/storybook-<name>/` (e.g., `apps/storybook-management/`, `apps/storybook-watering/`), and shared packages have one at `apps/storybook-packages/`. This allows independent Chromatic runs that skip unaffected modules. A unified Storybook at `apps/storybook/` aggregates all stories for local development convenience but is not used by Chromatic.

## Consequences

See [ARCHITECTURE.md](../ARCHITECTURE.md#domain-storybooks) for the resulting Storybook structure.

Additional implications:

- Separate Chromatic project tokens per module (`MANAGEMENT_CHROMATIC_PROJECT_TOKEN`, `WATERING_CHROMATIC_PROJECT_TOKEN`, `PACKAGES_CHROMATIC_PROJECT_TOKEN`).
- Adding a new module requires a new Storybook app at `apps/storybook-<name>/`, a Chromatic token, and an update to `StorybookDependencies` in `scripts/get-affected-storybooks.ts`.
