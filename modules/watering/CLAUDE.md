# Watering Module

Daily plant care features: today (landing page with watering actions, shared care coordination, responsibility assignments, actor-tracked care events, and grouped Today view).

## Stories

Never write stories without first loading the `plantz-adlc-code` skill for storybook conventions that apply to all modules.

Every page and component must have a co-located `.stories.tsx` file. A feature without stories is not complete.

### Module-Specific

- Title prefix: `Watering/Today/` for today subfolder (e.g., `Watering/Today/Pages/LandingPage`).
- Reference: `modules/watering/src/today/LandingPage.stories.tsx`.
- Storybook dev command: `pnpm dev-storybook-watering`.

## Storybook Setup

Each subfolder (under `src/`) has a `storybook.setup.tsx` that imports `initializeFireflyForStorybook` and `withFireflyDecorator` from `@squide/firefly-storybook`, and creates a `QueryDecorator` providing a fresh `QueryClient` per story. Story files import `queryDecorator` and `fireflyDecorator` from `./storybook.setup.tsx` and add both to `decorators: [queryDecorator, fireflyDecorator]`. MSW is managed globally via `msw-storybook-addon` in preview.tsx; per-story handlers use `parameters.msw.handlers`. Presentational component stories don't need the decorators.

## Storybook Wiring

Module storybook: `@apps/storybook-watering` (`apps/storybook-watering/`).

Story globs in `.storybook/main.ts` must include every subfolder in this module. When adding a subfolder, add its glob: `../../../modules/watering/src/{subfolder}/**/*.stories.tsx`.

## Data Layer

This module's API surface lives under `/api/today/`. Data access uses TanStack Query hooks co-located with the components that use them:

- `src/today/useTodayPlants.ts` — Query hooks (`useTodayPlants`, `useMarkWatered`, `usePlantCareEvents`). Hooks encapsulate query keys, fetch calls, and `parsePlant()` date coercion. Mutation invalidates care-events query on watering success.
- `src/today/useAssignment.ts` — Query hooks (`useAssignment`, `useUpdateAssignment`) for responsibility assignments per plant.
- `src/today/useHouseholdMembers.ts` — Query hook (`useHouseholdMembers`) for listing household members (used in assignment selectors).
- `src/today/useAssignments.ts` — Batch query hook (`useSharedAssignments`) for fetching assignments for all shared plants.
- `src/today/useCareEvents.ts` — Query hook for bulk care event fetching across multiple plants.
- `src/today/useHouseholdInfo.ts` — Query hook for the current user's household context (used to determine grouped vs flat view).
- `@packages/api/entities/plants` — `Plant` type (with optional `householdId`) and `parsePlant()` for date coercion.
- `@packages/api/entities/household` — `HouseholdMember`, `ResponsibilityAssignment`, `HouseholdInfo` types.
- `@packages/api/entities/care-events` — `CareEvent` type and `parseCareEvent()`.
- `@packages/api/handlers/today` — MSW handlers (runtime + storybook factories) for plants, assignments, care events, and household info.

Components read with `useQuery` hooks and write with `useMutation` hooks.

See `msw-tanstack-query.md` in `.claude/skills/plantz-adlc-*/references/` for implementation patterns.
