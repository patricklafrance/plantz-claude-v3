# Management Module

Plant management features: inventory (plants CRUD, sharing toggle), account (user profile), and household (CRUD, members, invitations).

## Stories

Never write stories without first loading the `plantz-adlc-code` skill for storybook conventions that apply to all modules.

Every page and component must have a co-located `.stories.tsx` file. A feature without stories is not complete.

### Module-Specific

- Title prefix: `Management/Inventory/` for inventory subfolder (e.g., `Management/Inventory/Pages/PlantsPage`, `Management/Inventory/Components/FilterBar`).
- Title prefix: `Management/Account/` for account subfolder (e.g., `Management/Account/Pages/UserPage`).
- Title prefix: `Management/Household/` for household subfolder (e.g., `Management/Household/Pages/HouseholdPage`).
- Reference: `modules/management/src/inventory/FilterBar.stories.tsx` (presentational component), `modules/management/src/inventory/PlantsPage.stories.tsx` (page with query + firefly decorators), `modules/management/src/household/HouseholdPage.stories.tsx` (page with household handlers).
- Storybook dev command: `pnpm dev-storybook-management`.

## Storybook Setup

Each subfolder (under `src/`) has a `storybook.setup.tsx` that imports `initializeFireflyForStorybook` and `withFireflyDecorator` from `@squide/firefly-storybook`, and creates a `QueryDecorator` providing a fresh `QueryClient` per story. Story files import `queryDecorator` and `fireflyDecorator` from `./storybook.setup.tsx` and add both to `decorators: [queryDecorator, fireflyDecorator]`. MSW is managed globally via `msw-storybook-addon` in preview.tsx; per-story handlers use `parameters.msw.handlers`. Presentational component stories (e.g., FilterBar, DeleteConfirmDialog) don't need the decorators.

## Storybook Wiring

Module storybook: `@apps/storybook-management` (`apps/storybook-management/`).

Story globs in `.storybook/main.ts` must include every subfolder in this module. When adding a subfolder, add its glob: `../../../modules/management/src/{subfolder}/**/*.stories.tsx`.

## Data Layer

This module's API surface lives under `/api/management/`. Data access uses TanStack Query hooks co-located with the components that use them:

- `src/inventory/useManagementPlants.ts` — Query hooks (`useManagementPlants`, `useCreatePlant`, `useUpdatePlant`, `useDeletePlant`, `useDeletePlants`). Hooks encapsulate query keys, fetch calls, and `parsePlant()` date coercion.
- `src/inventory/useHouseholdMembership.ts` — Query hook (`useHouseholdMembership`) for checking the current user's household membership (used by the sharing toggle).
- `src/household/` — Query hooks for household CRUD, members, and invitations (`useHousehold`, `useHouseholdMembers`, `useHouseholdInvitations`, `useCreateHousehold`, `useSendInvitation`).
- `@packages/api/entities/plants` — `Plant` type and `parsePlant()` for date coercion.
- `@packages/api/entities/household` — `Household`, `HouseholdMember`, `Invitation`, `HouseholdMembership` types.
- `@packages/api/handlers/management` — MSW handlers (runtime + storybook factories) for plants, household, and membership.

Components read with `useQuery` hooks and write with `useMutation` hooks.

See `msw-tanstack-query.md` in `.claude/skills/plantz-adlc-*/references/` for implementation patterns.
