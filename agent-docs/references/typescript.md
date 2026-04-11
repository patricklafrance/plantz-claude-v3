# TypeScript

Root `tsconfig.json` extends `@workleap/typescript-configs/monorepo-workspace.json` with incremental builds enabled (`tsBuildInfoFile` in `node_modules/.cache/`).

Type checking runs via `tsgo` (native TypeScript compiler).

## CSS ambient declarations

`tsgo` requires ambient type declarations for CSS side-effect imports (`import "./styles/globals.css"`). Any app or Storybook that imports `.css` files needs a `css.d.ts` file within its TypeScript project scope:

```typescript
declare module "*.css" {}
```

Current locations: `apps/host/src/css.d.ts`, `apps/storybook-packages/css.d.ts`.
