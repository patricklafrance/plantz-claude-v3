# ODR-0005: Knip for Dead Code Detection

## Status

accepted

## Context

The monorepo lacked tooling to detect unused files, unused dependencies, unlisted dependencies, and unused exports. These issues accumulate silently over time — especially in a modular monorepo where packages are added, refactored, or scaffolded frequently. Existing linters (oxlint, syncpack) cover code quality and version consistency but not dead code.

## Options Considered

1. **Knip** — Purpose-built tool for finding unused files, dependencies, and exports in JS/TS projects. Native monorepo support via pnpm workspace detection. 139+ plugins auto-detect tools like Storybook, Vite, Vitest, and MSW. Runs as a single root-level analysis pass.
2. **oxlint no-unused-imports + depcheck** — Combine oxlint's unused-import rules with depcheck for unused dependencies. Requires two tools, neither detects unused files or exports across workspace boundaries.
3. **Manual review** — Rely on code review to catch dead code. Does not scale and misses transitive unused exports.

## Decision

Use Knip (Option 1). It is installed at the workspace root as a global tool and runs as a root-level Turborepo task (`//#knip`), following the same pattern as `//#oxlint`, `//#oxfmt`, and `//#syncpack`.

## Consequences

- `knip.json` at the repo root defines workspace mappings and `ignoreDependencies` for known false positives.
- The `//#knip` task is wired into the `lint` pipeline via `dependsOn`, so `pnpm lint` runs knip alongside all other quality checks.
- All issue types are errors — no categories are downgraded to warnings.

See [references/static-analysis.md](../references/static-analysis.md) for the suppression policy and per-tool configuration guidance.
