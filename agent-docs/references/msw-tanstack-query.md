# TanStack Query + MSW

## Principle: Consistency over ceremony

Every data operation uses the same pattern: TanStack Query hooks (`useQuery`/`useMutation`) through MSW-intercepted endpoints. Components never call `fetch()` directly. No plain fetch shortcuts, no client-side-only mutations.

## Data Flow

1. Components read data with `useQuery` hooks co-located in the module — returns `{ data, isPending, error }`
2. Components write data with `useMutation` hooks — calls `fetch()` internally, invalidates query cache on success
3. Each hook contains its own `queryKey`, `queryFn`/`mutationFn`, and `parsePlant()` for date coercion
4. MSW intercepts requests and serves from an in-memory `Map<string, Plant>` (shared DB internal to `@packages/api`)
5. Date fields (`nextWateringDate`, `creationDate`, `lastUpdateDate`) are parsed via `new Date()` in a `parsePlant()` function — no Zod

## Query Hooks

Query hooks live in the module that uses them, co-located with components:

```typescript
// modules/management/src/inventory/useManagementPlants.ts
import { useManagementPlants, useCreatePlant, useUpdatePlant } from "./useManagementPlants.ts";

// modules/watering/src/today/useTodayPlants.ts
import { useTodayPlants, useMarkWatered } from "./useTodayPlants.ts";
```

Hooks import `parsePlant()` and entity types from `@packages/api/entities/plants`. Query keys and fetch URLs are encapsulated inside each hook file.

## Query Hook Pattern

Each module's hook file follows the same structure:

```typescript
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Plant } from "@packages/api/entities/plants";
import { parsePlant } from "@packages/api/entities/plants";

const API_BASE = "/api/management/plants";
const QUERY_KEY = ["management", "plants", "list"];

export function useManagementPlants() {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const response = await fetch(API_BASE);
            if (!response.ok) throw new Error(`Failed to fetch plants: ${response.status}`);
            const data: unknown[] = await response.json();
            return data.map(item => parsePlant(item as Record<string, unknown>));
        }
    });
}

export function useCreatePlant() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Omit<Plant, "id" | "userId" | "creationDate" | "lastUpdateDate">) => {
            const response = await fetch(API_BASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`Failed to create plant: ${response.status}`);
            return parsePlant(await response.json());
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    });
}
```

Key patterns:

- Query keys are encapsulated constants — never leaked to components
- `parsePlant()` converts ISO date strings to `Date` objects (replaces Zod's `z.coerce.date()`)
- Mutations invalidate the query cache on success — no manual refetch needed
- Entity types are plain TS interfaces in `@packages/api/entities/plants`

## API Package vs. Module Boundary

| Concern                                | Where it lives                                | Why                                                       |
| -------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| Entity types (`Plant`, `User`)         | `@packages/api/entities/*`                    | Shared contract — used by handlers, hooks, and test utils |
| MSW handlers                           | `@packages/api/handlers/*`                    | Backend simulation — framework-agnostic, no React         |
| DB singletons + seed                   | `@packages/api/db/*` (internal)               | Shared state across modules                               |
| Test factories (`makePlant`)           | `@packages/api/test-utils`                    | Shared across storybooks                                  |
| Query hooks (`useQuery`/`useMutation`) | Module-local (e.g., `useManagementPlants.ts`) | React hooks — consumers of the API, not part of it        |

The API package has zero React dependency — it's a pure data/handler package. React hooks live in modules next to the components that use them.

## Host App (Squide Integration)

The host creates `QueryClient` before `initializeFirefly` and wraps the app with `QueryClientProvider`. Modules don't receive `queryClient` — hooks get it from the provider. The host seeds all DBs via `seedDatabase()` from `@packages/api/seed`.

## Module Registration

Each module registers routes and MSW handlers:

```typescript
export async function registerTodayLandingPage(runtime: FireflyRuntime) {
    runtime.registerRoute({ path: "/today", lazy: () => import("./LandingPage.tsx").then(m => ({ element: <m.LandingPage /> })) });

    if (runtime.isMswEnabled) {
        const { todayPlantHandlers } = await import("@packages/api/handlers/today");
        runtime.registerRequestHandlers(todayPlantHandlers);
    }
}
```

## Centralized Handlers

All MSW handlers live in `@packages/api/handlers/<module-name>/`. Handlers are self-contained — they use entity types and internal DB singletons, never importing from module feature code. Auth handlers live in `@packages/api/handlers/auth`. Module endpoints follow `/api/<domain>/<entity>`. Handlers share state through internal DB singletons (`plantsDb`, `usersDb`). MSW handlers read `sessionStorage` directly for user identity — no `Authorization` headers.

## Storybook Setup

MSW is managed globally via `msw-storybook-addon` (`initialize({ onUnhandledRequest: "bypass" })` + `mswLoader` in preview.tsx).

Each domain has a `storybook.setup.tsx` providing two decorators:

- `fireflyDecorator` — Squide runtime via `initializeFireflyForStorybook()` + `withFireflyDecorator()` from `@squide/firefly-storybook`
- `queryDecorator` — fresh `QueryClient` with `retry: false, staleTime: Infinity` wrapped in `QueryClientProvider`

Story files: `decorators: [queryDecorator, fireflyDecorator]`, `parameters: { msw: { handlers: [...] } }`. Per-story overrides via `parameters.msw.handlers`. Use `delay("infinite")` for loading states. The packages storybook needs none of this (presentational only).
