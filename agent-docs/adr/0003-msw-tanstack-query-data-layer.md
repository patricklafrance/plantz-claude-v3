# ADR-0003: No Backend Server — MSW + TanStack Query as Data Layer with BFF-per-Module

> **Note:** Handler placement is partially superseded by [ADR-0004](0004-layered-package-architecture.md). Handlers live in `@packages/api/handlers/<module-name>/`, not in modules. See ADR-0004 for current handler location and the API package tier.

## Status

accepted

## Decision

The app has no backend process. MSW intercepts browser `fetch()` calls and serves from an in-memory store. TanStack Query provides data fetching, caching, and server state management via `useQuery` and `useMutation` hooks. Components use real REST patterns that would point at a real API in production — MSW is the only thing that would be swapped out.

A standalone local API server (e.g., json-server) was rejected because it adds process management complexity and complicates Storybook and CI environments.

### Per-module query hooks

Each module defines its own TanStack Query hooks co-located with components (e.g., `useManagementPlants.ts`, `useTodayPlants.ts`). Hooks import entity types and `parsePlant()` from `@packages/api/entities/plants` but live in the module — they are consumers of the API, not part of it. Hooks obtain `QueryClient` from the React context provider (`QueryClientProvider`), so module registration functions do not receive a `queryClient` parameter. In Storybook, a `queryDecorator` creates a fresh `QueryClient` per story.

### BFF-per-module constraint

Each Squide module owns its API surface — handlers and URL namespace — scoped under a domain URL namespace (`/api/<domain>/<entity>`). Modules never share handlers. The shared data dependencies are in-memory DB singletons: `plantsDb` in `@packages/api/db`. Cross-module data visibility works through the shared DBs, not through shared client-side state.

This mirrors a real BFF (backend-for-frontend) architecture: each frontend surface shapes its own API layer. It also reinforces the module isolation rule from [ADR-0001](0001-squide-local-modules.md) — modules stay independently deployable at the data layer, not just the UI layer.

## Consequences

- Data resets on page reload (intentional for POC).
- Adding a new module requires creating local query hooks (co-located with components) and importing handler factories from `@packages/api/handlers/*`.
- URL namespaces must not collide between modules.
- Domain modules need a `storybook.setup.tsx` wiring `initializeFireflyForStorybook` + `withFireflyDecorator` from `@squide/firefly-storybook`, and a `queryDecorator` for per-story `QueryClientProvider`. MSW is managed globally via `msw-storybook-addon` in preview.tsx.

See `agent-docs/references/msw-tanstack-query.md` for implementation patterns.
