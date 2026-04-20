# Architecture

## What is plantz-claude

A plants watering application and proof-of-concept for Claude Code agent workflows. Built as a modular monolith using pnpm, Turborepo, and Squide local modules.

## Design principle

Squide modules and shared packages follow the deep-modules principle (Ousterhout): maximize functionality behind minimal interfaces. This is already enforced by wide-scoped modules ([ADR-0001](adr/0001-squide-local-modules.md)), fixed package tiers with anti-scopes ([ADR-0004](adr/0004-layered-package-architecture.md)), and the duplication-over-extraction default.

## Repository structure

```
plantz-claude/
  apps/
    host/                        # Squide host application (@apps/host)
    storybook/                       # All stories across the repo (@apps/storybook)
    storybook-packages/              # Shared package stories (@apps/storybook-packages)
    storybook-management/            # Management module Storybook (@apps/storybook-management)
    storybook-watering/              # Watering module Storybook (@apps/storybook-watering)
  modules/
    management/                      # @modules/management (inventory + account + household subfolders)
    watering/                        # @modules/watering (today subfolder)
  packages/
    api/                             # API layer — entity types, MSW handlers, test factories (@packages/api)
    components/                      # Shared UI components — shadcn/ui + Tailwind v4 (@packages/components)
    core/                            # Cross-cutting foundation — shared utilities, types, constants (@packages/core)
    core-module/                     # Session, auth error handling, app shell (@packages/core-module)
  scripts/                           # Build scripts (get-affected-storybooks.ts)
  agent-docs/                        # Agent documentation (this folder)
  .agents/skills/                    # Shared agent skills (git-commit, etc.)
  .claude/skills/                    # Claude Code discovery layer — symlinks to .agents/skills/ plus project-specific skills
  .github/workflows/                 # CI, Chromatic, Lighthouse
```

## Package naming conventions

| Workspace path          | Package scope | Example                      |
| ----------------------- | ------------- | ---------------------------- |
| `apps/host`             | `@apps/*`     | `@apps/host`                 |
| `apps/storybook-<name>` | `@apps/*`     | `@apps/storybook-management` |
| `modules/*`             | `@modules/*`  | `@modules/management`        |
| `packages/*`            | `@packages/*` | `@packages/api`              |

> **Exception:** `apps/storybook-packages` uses `@apps/storybook-packages` (historical convention — Storybook runner apps always use `@apps/*`).

## Squide host/module topology

- **Host** (`apps/host/`): Thin bootstrap layer. Creates `QueryClient`, calls `initializeFirefly` with `registerShell` (from `@packages/core-module/shell`) and active modules, seeds mock data, and renders `<App />`. Shell components (RootLayout, LoginPage, NotFoundPage, UserMenu, auth MSW handlers) live in `@packages/core-module/shell`, not in the host. Feature logic lives in modules.
- **Modules**: Each module registers via `(runtime) => Promise<void>`. The host wraps these in closures matching Squide's `ModuleRegisterFunction` signature. Modules are isolated — they never import from each other. When two modules need to share code: prefer duplication if the surface area is small; extract to a shared package under `packages/` (e.g., `@packages/core-module` for session infrastructure, `@packages/api` for backend simulation) when it's large enough to justify the indirection.
- **Module registry**: `apps/host/src/getActiveModules.tsx` maps module names to their register functions. The host loads only modules present in this map. Each module has ONE register function that handles all its routes.
- **Module internal structure**: Modules are wide-scoped — each covers a broad set of related features organized into internal subfolders. `@modules/management` has `inventory/`, `account/`, and `household/` subfolders. `@modules/watering` has a `today/` subfolder. These subfolders are NOT separate packages — they are internal organizational boundaries within a single package.
- **Shared packages**: Four tiers live under `packages/`, each with a distinct scope (see [ADR-0004](adr/0004-layered-package-architecture.md)):
    - `@packages/core` — Cross-cutting **foundation** at the bottom of the dependency graph. Any package can import from it. Currently empty — will accumulate shared utilities, types, and constants as the app grows.
    - `@packages/api` — The **API layer**. Two internal layers: (1) **Entities** — plain TS interfaces and date parsing (`./entities/plants`, `./entities/auth`, `./entities/household`, `./entities/invitation`); (2) **Handlers** — MSW runtime + storybook factory handlers (`./handlers/*`, including `./handlers/household` for household/invitation/assignment endpoints). DB singletons (plants, household, members, invitations, care events) and seed data are internal — never exported. Handlers are self-contained and do not import from module feature code. TanStack Query hooks live in modules, not here — the API package has zero React dependency.
    - `@packages/core-module` — Session and **shell** infrastructure: `Session` type, `useSession`, `SessionProvider`, `AuthError`, `getCurrentUserId`, and the app shell (`./shell` sub-path — RootLayout, LoginPage, NotFoundPage, UserMenu, registerShell).
    - `@packages/components` — Feature-agnostic **UI** (shadcn/ui + Tailwind v4). Could theoretically be extracted as a standalone design system.
- **JIT packages**: Packages under `packages/` expose source directly via `exports` fields (e.g., `"./": "./src/index.ts"`). Consumers compile them at build time through their own bundler — no pre-build step is required. This means the Turborepo `dev` task has no `^dev` dependency; persistent watch builds in packages run in parallel, not as prerequisites. See [ODR-0004](odr/0004-jit-packages.md) for rationale.

See [ADR-0001](adr/0001-squide-local-modules.md) for rationale.

## Storybooks

Each module has its own Storybook at `apps/storybook-<name>/` with independent Chromatic tokens:

- **storybook-management** — Stories for the management module (`apps/storybook-management/`)
- **storybook-watering** — Stories for the watering module (`apps/storybook-watering/`)

A packages-layer Storybook (`apps/storybook-packages/`, `@apps/storybook-packages`) is purely a runner for shared package stories — it contains no exported utilities. Storybook infrastructure (MSW via `msw-storybook-addon`, Squide runtime via `@squide/firefly-storybook`, `QueryClientProvider`) is configured per-module in each module's `storybook.setup.tsx`. A unified Storybook (`apps/storybook/`) aggregates all stories across the entire repo and is the sole target for browser verification. See `agent-docs/references/agent-browser.md` for dev server startup instructions. Per-module storybooks are used for Chromatic visual regression, a11y tests, and developer workflow.

See [ADR-0002](adr/0002-domain-scoped-storybooks.md) for rationale.

## Data layer — BFF-per-module

There is no backend server. MSW intercepts browser `fetch()` calls and serves from a shared in-memory database. TanStack Query hooks (`useQuery`/`useMutation`) are the sole data access pattern — components never call `fetch()` directly. In production, MSW would be swapped for real API endpoints — the rest stays the same.

Each module owns its full API surface (a "BFF-per-module" model):

- **Query hooks** — Each module defines its own `useQuery`/`useMutation` hooks co-located with components (e.g., `useManagementPlants.ts`, `useTodayPlants.ts`). Hooks encapsulate query keys, fetch calls, and import `parsePlant()` from `@packages/api/entities/plants` for date coercion. The host wraps the app with `QueryClientProvider`; hooks get `QueryClient` from the provider.
- **Handlers** — MSW request handlers live in `@packages/api/handlers/<module-name>/`, scoped to `/api/<prefix>/<entity>` URLs (e.g., `/api/management/plants`, `/api/today/plants`, `/api/management/user/profile`). Modules import handlers from `@packages/api` for registration and Storybook setup.
- **Shared DB** — All modules read/write the same in-memory stores inside `@packages/api`. DB singletons are internal to the api package — never exported. Cross-module visibility works through the shared DB. The host seeds all DBs via `seedDatabase()` from `@packages/api/seed`.

Handlers are centralized in `@packages/api` but scoped per module URL prefix.

**Auth layer** — Auth MSW handlers (`/api/auth/*`) live in `@packages/api/handlers/auth`. The login handler stores the auth token in `sessionStorage`; the logout handler clears it. MSW handlers read `sessionStorage` directly via an internal `getUserId()` utility to identify the current user — no `Authorization` headers are used. Frontend code uses `useSession()` from `@packages/core-module` for the current user identity.

See [ADR-0003](adr/0003-msw-tanstack-query-data-layer.md) for rationale. See `agent-docs/references/msw-tanstack-query.md` for implementation details.

## Technology stack

For exact versions, read the root `package.json` (`engines`, `packageManager`, `devDependencies`).

| Tool                | Purpose                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| Node.js             | Runtime                                                                      |
| pnpm                | Package manager                                                              |
| TypeScript          | Type checking (`@typescript/native-preview` — tsgo)                          |
| Squide              | Modular monolith shell (local modules)                                       |
| Storybook           | Component development                                                        |
| Chromatic           | Visual regression testing                                                    |
| Tailwind CSS        | Utility-first CSS framework (via `@tailwindcss/postcss`)                     |
| shadcn/ui (Base UI) | UI component library, base-nova preset (lives in `@packages/components`)     |
| Turborepo           | Task orchestration and caching                                               |
| oxlint              | Fast JS/TS linter (zero config)                                              |
| oxfmt               | Fast code formatter (Prettier-compatible, import sorting, Tailwind sort)     |
| Knip                | Dead code detection (unused files, deps, exports)                            |
| Syncpack            | Dependency version enforcement                                               |
| MSW                 | Mock Service Worker for API mocking in browser and Storybook                 |
| TanStack Query      | Server state management — `useQuery`/`useMutation` hooks for all data access |
| TanStack Virtual    | List virtualization (`@tanstack/react-virtual`)                              |
| agent-browser       | Browser automation CLI for verifying UI changes                              |

## Script conventions

Scripts in root `package.json` follow a prefix convention: `dev-*` (local dev servers), `build-*` / `serve-*` (production), `lint` / `typecheck` / `syncpack` (quality), `clean` / `reset` (maintenance). Read root `package.json` for the full list — never duplicate it in docs.

## MODULES env var

Set `MODULES` to load only specific modules during development:

```bash
cross-env MODULES=management pnpm dev-app    # only management
cross-env MODULES=watering pnpm dev-app      # only watering
```

Omit `MODULES` to load all modules. The value maps to the module's directory name under `modules/`.

## Maintaining this doc

- When a section exceeds ~40 lines, extract it to its own file in the appropriate `agent-docs/` subfolder.
- Cross-package contracts (e.g., "modules never import each other") belong here. Let the code (TypeScript types, barrel exports) document its own public API.
