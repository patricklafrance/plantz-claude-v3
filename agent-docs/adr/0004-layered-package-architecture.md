# ADR-0004: Layered Package Architecture with Centralized API Layer

## Status

accepted (supersedes parts of ADR-0003 BFF-per-module handler ownership)

## Decision

The shared package layer uses a fixed vertical structure organized by architectural concern, not by domain:

- `@packages/core` — Cross-cutting foundation. Shared utilities, types, and constants that any package can import. Sits at the bottom of the dependency graph.
- `@packages/api` — API layer with two internal layers: (1) **Entities** — plain TS interfaces and utility functions like `parsePlant()` for date coercion (exported via `./entities/plants`, `./entities/auth`); (2) **Handlers** — MSW runtime + storybook factory handlers (exported via `./handlers/*`). DB singletons and seed data are internal — never exported. Handlers are self-contained and do not import from module feature code. Zero React dependency — TanStack Query hooks live in modules, co-located with the components that use them.
- `@packages/core-module` — Session and shell infrastructure. Session context, auth error handling, current user identity, and the app shell UI.
- `@packages/components` — Feature-agnostic UI primitives (shadcn/ui + Tailwind v4).

### Exception to ADR-0003 BFF-per-module handler ownership

ADR-0003 stated: "Each Squide module owns its entire API surface — handlers and URL namespace." This is partially superseded: MSW handlers live in `@packages/api/handlers/<module-name>/` (centralized backend simulation). TanStack Query hooks live in the modules themselves, co-located with components. The BFF URL namespace convention (`/api/<domain>/<entity>`) is preserved. Modules still own their route registration and data-fetching hooks.

### Why centralize handlers

MSW handlers simulate a backend API. They should be treated as backend code:

- Handlers use entity DTOs and own their own business logic.
- Handlers do not import utilities from frontend module code (accidental coupling).
- When a real backend replaces MSW, handlers are swapped entirely — keeping them separate from module UI code makes this clean.

### Why `@packages/core` starts empty

`core` exists as an architectural placeholder at the bottom of the dependency graph. Any package (`api`, `core-module`, `components`) can depend on it. It will accumulate cross-cutting code as the app grows (e.g., shared constants, generic utilities, error types, feature flags). Creating it now avoids a future structural refactor when the first cross-package need emerges.

### API entity type exception

All entity types live in `@packages/api/entities/*`, even if only one module consumes them. These are response DTOs owned by the "backend" — they describe what the API returns. The "promote to shared package only when a second module needs it" rule applies to frontend feature code, not to API layer code.

### DB internals are not exported

DB singletons (`plantsDb`, `usersDb`), seed data, and handler-side utilities are internal to the api package. They are only consumed by handlers via relative imports. The host app seeds all DBs via a single `seedDatabase()` function from `@packages/api/seed`. Storybook handler factories accept entity data as parameters — they never touch DB singletons.

### Module-local query hooks

Each module defines its own TanStack Query hooks co-located with components (e.g., `useManagementPlants.ts`, `useTodayPlants.ts`). Hooks encapsulate endpoint URLs, query keys, `parsePlant()` date coercion, and TanStack Query wiring. They import entity types and `parsePlant()` from `@packages/api/entities/plants` but live in the module — they are consumers of the API, not part of it. This keeps the API package free of React dependencies.

## Consequences

- Modules have no `mocks/` folders. They import handlers from `@packages/api/handlers/*` for Storybook and registration.
- Modules define their own TanStack Query hooks co-located with components, importing entity types from `@packages/api/entities/*`.
- Adding a new domain entity means adding files to `@packages/api` (entity types in `entities/`, DB in `db/`, handlers in `handlers/`, seed data, test factory in `test-utils/`), then creating module-local query hooks.
- The `@packages/api` package will be the largest package — mitigated by per-domain subpath exports and clear internal layering.
- `@packages/core` starts empty. If it remains empty for an extended period, consider removing it.
