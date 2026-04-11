# ADR-0001: Modular Monolith with Workleap Squide Local Modules

## Status

accepted

## Context

plantz-claude needs to support multiple feature areas (plant management, daily watering) with independent lifecycles. Each module should be developed, tested, and deployed without tight coupling to the others.

## Options Considered

1. **Workleap Squide local modules** — A modular monolith using Squide's local module system. Modules register routes and navigation via `ModuleRegisterFunction`. Host is a thin shell (`FireflyRuntime` + `AppRouter`). Modules are imported at build time but architecturally isolated — no runtime federation overhead.
2. **Monolithic React app** — Single app with folder-based code organization. Simpler initially, but module boundaries are conventions only — no enforcement of isolation.

## Decision

Use Workleap Squide local modules (Option 1). It provides module isolation boundaries enforced by the framework.

## Consequences

See [ARCHITECTURE.md](../ARCHITECTURE.md#squide-hostmodule-topology) for the resulting topology (host, modules, shared packages).

Additional implications:

- Cross-module communication goes through Squide runtime APIs (event bus, shared data queries) — not direct imports. Modules never import from each other — no exceptions. When two modules need shared code, prefer duplication if the surface area is small; extract to a package under `packages/` when it's large enough to justify the indirection.
- Each module is a single wider-scoped package under `modules/` with internal subfolders for feature areas (e.g., `modules/management/` contains `inventory/` and `account/` subfolders). Subfolders are NOT separate packages.
- New feature areas require creating a new module package under `modules/`.
