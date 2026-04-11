# Tailwind CSS / PostCSS

Tailwind v4 via `@tailwindcss/postcss`. Host app and library packages use an Rsbuild/Rslib config transformer. Storybooks use a plain `vite.config.ts` with `tailwindcss()` as a PostCSS plugin.

## Cross-package class scanning

`@import "tailwindcss"` lives in `packages/components/src/styles/globals.css`. Consuming apps import it via `@import "@packages/components/globals.css"` — they must **not** add a separate `@import "tailwindcss"`.

Apps use `@source` directives to tell Tailwind where to find utility classes:

```css
@import "@packages/components/globals.css";

@source "../../../../packages/components/src/**/*.{ts,tsx}";
@source "../../../../packages/core-module/src/shell/**/*.{ts,tsx}";
@source "../../../../packages/core-plants/src/**/*.{ts,tsx}";
@source "../../../management/plants/src/**/*.{ts,tsx}";
/* ... each domain module */
```

Domain storybooks have their own CSS files with `@source` directives scoped to their relevant packages/modules.

**When adding a new module or package:** add a `@source` directive in `apps/host/src/styles/globals.css` and in relevant storybook CSS files.
