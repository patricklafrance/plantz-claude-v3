# Operational Decisions

> Quick-reference for agents. Each line is a deliberate decision — read the linked ODR only if you need the full rationale.

| Decision                                                                                       | ODR                                                |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| pnpm workspaces + Turborepo for package management and task orchestration                      | [ODR-0001](0001-pnpm-turborepo-monorepo.md)        |
| Apps pin all deps; packages use `^` for prod/peer; enforced by syncpack                        | [ODR-0002](0002-dependency-versioning-syncpack.md) |
| Chromatic runs are label-gated and skip unaffected Storybooks via `get-affected-storybooks.ts` | [ODR-0003](0003-selective-chromatic-runs.md)       |
| Packages expose source via `exports` (JIT); no pre-build needed for dev                        | [ODR-0004](0004-jit-packages.md)                   |
| Knip detects unused files, dependencies, and exports; runs as `//#knip` in the lint pipeline   | [ODR-0005](0005-knip-dead-code-detection.md)       |
