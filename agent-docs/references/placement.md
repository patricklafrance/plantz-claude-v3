# Code Placement

## Decision Tree: "Where does feature X go?"

1. **Cross-cutting utility needed by any package?** → `@packages/core`
2. **Entity type, MSW handler, seed data, or test factory?** → `@packages/api`
3. **TanStack Query hook (useQuery/useMutation)?** → The module that uses it (co-located with components)
4. **Auth, session, layout, or app shell?** → `@packages/core-module` (or `@packages/core-module/shell`)
5. **Reusable UI with no feature logic?** → `@packages/components`
6. **Plant inventory, plant configuration, user account, or household management?** → `@modules/management`
7. **Daily watering tasks, shared care coordination, or responsibility assignments?** → `@modules/watering`

**Consistency over ceremony:** Every data operation must use the same pattern — TanStack Query hooks through MSW-intercepted endpoints. No plain `fetch()` in components, no client-side-only mutations.

## Modules

| Module                | Scope                                                                                                                      | Subfolders                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `@modules/management` | Plant identity, ownership, configuration, user account/preferences, and household management (CRUD, members, invitations). | `inventory/`, `account/`, `household/` |
| `@modules/watering`   | Daily care execution, shared care coordination, responsibility assignments, actor-tracked care events, and activity feed.  | `today/`                               |

The **host** (`apps/host/`) is not a module — it's a thin bootstrap wiring `registerShell` with modules.

### Subfolder placement

Within a module, pick the subfolder by asking: _Which area of concern does this feature serve?_

- **management/inventory/** — Plant CRUD, plant details, plant list views, plant sharing toggle
- **management/account/** — User profile, preferences, settings
- **management/household/** — Household CRUD, member management, invitations
- **watering/today/** — Daily care dashboard, watering actions, responsibility assignments, care event history, shared/grouped Today view

Subfolders are internal organizational boundaries — they share the same package scope, build config, and registration function.

## Packages

| Package                 | Responsibility                                                                                                                                                                                                                                                        | Anti-scope                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `@packages/core`        | Cross-cutting foundation: shared utilities, types, and constants importable by any other package. Bottom of the dependency graph.                                                                                                                                     | No domain-specific logic. No React components. No MSW/DB code.               |
| `@packages/api`         | API layer: entity types and date parsing (`./entities/plants`, `./entities/auth`, `./entities/household`, `./entities/care-events`), MSW handlers (`./handlers/*`), test factories (`./test-utils`). DB singletons and seed data are internal. Zero React dependency. | No routing. No React hooks. Handlers do not import from module feature code. |
| `@packages/core-module` | Session management, current user identity, auth error handling, shell UI (layout, navigation, login).                                                                                                                                                                 | No entity types. No DB singletons. No MSW handlers (those are in `api`).     |
| `@packages/components`  | Reusable design-system primitives (shadcn/ui) with zero feature logic.                                                                                                                                                                                                | No data fetching. No feature types. No business logic.                       |

## Module Isolation

Modules never import from each other. Small surface (a type, a constant): prefer duplication. Non-trivial shared logic: extract to `@packages/*`. This is a hard rule.

## API Layer Exception

All entity types, MSW handlers, seed data, and test factories live in `@packages/api` — even if consumed by only one module. These are API layer code that describes response shapes and backend simulation. TanStack Query hooks are **not** API layer code — they are React hooks that consume the API and live in the module that uses them. DB singletons are internal to the api package and never exported.
