# ODR-0004: JIT (Just-In-Time) Packages

## Status

accepted

## Context

Monorepos traditionally require library packages to be pre-built (`dist/`) before consumers can import them. This introduces dependency ordering in dev tasks (`^dev`), watch-build coordination, and stale-output bugs. Modern bundlers (Rsbuild, Rslib) can compile TypeScript source directly when pointed at it.

## Options Considered

1. **JIT packages via source `exports`** — Packages expose `src/` entry points in their `exports` field (e.g., `"./": "./src/index.ts"`). Consumers' bundlers compile the source on the fly. No `dist/` output is needed for development; production builds use Rslib for optimized output.
2. **Pre-built packages with watch mode** — Packages run a persistent watch build (`rslib build -w`) that outputs to `dist/`. Consumers import from `dist/`. Requires `^dev` dependency ordering in Turborepo so packages build before consumers start.
3. **TypeScript project references** — Use `tsc --build` with composite projects. Offers incremental builds but adds configuration complexity and doesn't integrate with bundler-level features (CSS modules, asset handling).

## Decision

Use JIT packages (Option 1). Packages under `packages/` expose source via `exports` fields. Consumers compile them directly through their own bundler.

## Consequences

- The Turborepo `dev` task has no `^dev` dependency — persistent tasks run in parallel, not sequentially.
- Packages that need a production build (e.g., `@packages/components`) still define `build` scripts using Rslib, but these are only needed for production output, not for local development.
- Package `exports` fields point to source (`./src/...`), not `dist/`.

See [references/turborepo.md](../references/turborepo.md) for task conventions and JIT constraints.
