# Storybook & Chromatic Conventions

For `packages/components/` stories, see that package's own `CLAUDE.md`.

## Title Conventions

- Pages: `{Domain}/{ModulePascalCase}/Pages/{PageName}` (routed views)
- Components: `{Domain}/{ModulePascalCase}/Components/{ComponentName}` (everything else)

## Variant Coverage

Every story file must cover **every visually distinct state**. One story per prop/state combination that produces a visually different rendering. Include edge cases: empty/null fields, long text overflow, boundary conditions, open/closed states. Skip combinations that look identical.

## Interactive State Stories

Play functions reach states that require interaction. A menu has a `Default` (closed) story and a `WithMenuOpen` story — the play function clicks the trigger because you can't render the open state without interaction.

Use `userEvent` and `within` from `storybook/test`:

```ts
import { userEvent, within } from "storybook/test";

export const WithMenuOpen: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByLabelText("User menu"));
    }
};
```

For `[interactive]` acceptance criteria, create one state story per visually distinct stage of the interaction:

- **Loading state** — play function triggers the action with a delayed MSW handler so the spinner is visible
- **Success state** — play function triggers the action and waits for the MSW response to resolve
- **Error state** — play function triggers the action against a failing MSW handler

Each story is a state snapshot. The play function is the mechanism to reach that state.

**Async patterns:** When a play function triggers a mutation, use `canvas.findByText(...)` or `canvas.findByRole(...)` (which retry until found) to wait for the post-mutation UI to render before the story snapshot is captured.

### Async-conditional UI in play functions

When a component renders UI conditionally based on an async hook (e.g., a Share button that only appears after `useHouseholdInfo()` resolves), play functions that try to find and click that element will race against the hook resolution. Long `findByRole` timeouts are fragile and slow.

**Use an internal prop to bypass the async dependency:**

```ts
// Component — add an internal prop to pre-set the async state
interface EditPlantDialogProps {
    plantId: string;
    /** @internal Test-only. Pre-sets sharing state to skip async resolution. */
    _defaultSharing?: boolean;
}

function EditPlantDialog({ plantId, _defaultSharing }: EditPlantDialogProps) {
    const [isShared, setIsShared] = useState(_defaultSharing ?? false);
    // ... useHouseholdInfo() still runs but _defaultSharing provides the initial state
}
```

```ts
// Story — use the internal prop, no async wait needed
export const ShareLoading: Story = {
    args: { _defaultSharing: true },
    parameters: { msw: { handlers: [http.put("/api/...", () => delay("infinite"))] } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: /share/i }));
    }
};
```

Prefix internal props with `_` and tag with `@internal` JSDoc. This avoids complex `waitFor` chains and produces deterministic story snapshots.

### Portal-based components (Base UI Dialog, AlertDialog, Popover, Select)

Base UI renders Dialog, AlertDialog, Popover, and Select content via a **portal** outside the Storybook canvas root. In play functions, `canvas.findByRole("dialog")` will fail because the portal is not inside `canvasElement`. Use `screen` from `@testing-library/react` instead:

```ts
import { screen } from "@testing-library/react";

export const WithDialogOpen: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: /create/i }));
        // Portal renders outside canvas — use screen, not canvas
        await screen.findByRole("dialog");
    }
};
```

### Base UI Select `SelectValue` rendering

`SelectValue` renders the raw encoded option value (e.g., `"fixed:user-alice"`) until the dropdown portal mounts on first open. Use a `placeholder` prop or a custom `ValueDisplay` component that maps values to human-readable labels so the initial render shows meaningful text.

## Chromatic Modes

All domain story files must set in `meta`:

```
parameters: { chromatic: { modes: {
    "light mobile": { theme: "light", viewport: 375 },
    "light tablet": { theme: "light", viewport: 768 },
    "light desktop": { theme: "light", viewport: 1280 },
    "dark mobile": { theme: "dark", viewport: 375 },
    "dark tablet": { theme: "dark", viewport: 768 },
    "dark desktop": { theme: "dark", viewport: 1280 }
} } }
```

Do NOT use legacy `chromatic.viewports`. Does not apply to `packages/components/` primitives (preview-level modes only).

**Date-dependent stories:** Use extreme dates (`new Date(2020, 0, 1)` for "due", `new Date(2099, 0, 1)` for "not due") so snapshots are deterministic. For components displaying the current date, accept an optional prop to inject a fixed date.

## Tailwind CSS Source Scanning

Each domain storybook's `.storybook/storybook.css` must include `@source` directives for every package whose components appear in stories. At minimum: `packages/components/src` and each domain module's `src`.

**When adding a new module or package:** add a `@source` directive in `apps/host/src/styles/globals.css` and in the relevant domain storybook CSS files.

## Isolation

- Page stories use `fireflyDecorator` (provides Squide runtime + React Router via memory router) and `queryDecorator` (`QueryClientProvider` with `retry: false, staleTime: Infinity`) as needed. Each domain module's `storybook.setup.tsx` defines these. See `msw-tanstack-query.md` for the full setup pattern.
- Extract presentational sub-components (dialogs, cards, sections) so they can be tested with a lighter decorator stack or none at all.
- `packages/components/` stories use no decorators — purely prop-driven. No MSW or QueryClient.

## A11y Test Suppression

A11y tests run via `addon-a11y` + `addon-vitest` (`pnpm test` in domain storybooks). To suppress a rule for a specific story or all stories in a file, use `parameters.a11y.config.rules` in the story or meta:

```ts
// Suppress for all stories in the file
const meta = {
    parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } }
};

// Suppress for a single story
export const Example: Story = {
    parameters: { a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } } }
};
```

Same suppression policy as static analysis — fix the code first, suppress only for genuine false positives.

## Storybook Roles

| Storybook                                                         | Purpose                                                                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Domain (`@apps/storybook-management`, `@apps/storybook-watering`) | Chromatic visual regression (own token, selective runs), a11y tests (`pnpm test` via vitest + addon-a11y), developer workflow |
| Packages (`@apps/storybook-packages`)                             | Chromatic for shared components, developer workflow                                                                           |
