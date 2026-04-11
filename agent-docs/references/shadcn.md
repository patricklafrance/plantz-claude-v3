# shadcn/ui

The project uses **shadcn v4** with **Base UI** (`"style": "base-nova"` in `components.json`), not Radix.

## `shadcn init`

Do not run `shadcn init` in library packages (Rslib) — it fails on framework detection. Create `components.json` manually instead. `shadcn add` works once the config exists.

## CLI fixups

The CLI has three bugs when run in `packages/components/` (Rslib library package):

1. **Literal `@/` folder** — the CLI creates a physical `@/` directory because it can't resolve the `@/` alias. Files must be moved to `src/`.
2. **`@base-ui` import mangling** — the CLI confuses the `@` in `@base-ui/react/*` package names with the `@/` alias, rewriting them into self-referential `@/components/ui/*` imports. Restore them to `@base-ui/react/<primitive>`. Use `pnpm dlx shadcn@latest add <component> --view <file>` to see correct upstream imports.
3. **Alias path resolution** — `@/lib/utils` imports must be replaced with relative paths using `.ts` extensions (e.g., `../../lib/utils.ts`) because the project uses `moduleResolution: "nodenext"`.

The CLI may also add runtime dependencies (e.g., `react-day-picker`, `date-fns`) — follow the dependency rules in `packages/components/CLAUDE.md`.

For the complete post-CLI workflow (fixups, semicolons, stories, exports, visual verification), follow the checklist in `packages/components/CLAUDE.md`.

## Tailwind v4 source detection

`globals.css` includes explicit `@source` directives so Tailwind v4 can find utility classes when the CSS is processed by a consuming package (e.g., Storybook's PostCSS). Without these, Tailwind's automatic content detection fails because the CSS file is resolved from a different package root. If you add new source directories under `packages/components/src/`, add a corresponding `@source` directive.

## Theme CSS variables

The globals CSS theme variables (oklch neutral palette) are independent of the style preset — the "nova" visual differences are in the component code itself, not the CSS variables.
