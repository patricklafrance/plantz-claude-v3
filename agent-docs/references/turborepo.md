# Turborepo

Configuration in `turbo.json`. UI mode: `tui`.

## Conventions

- `$TURBO_DEFAULT$` — Turborepo's default input heuristic (all tracked files minus outputs).
- Root-level tasks use `//#taskname` syntax.
- `lint` is an orchestrator task — it has no logic of its own, only `dependsOn` that fan out to the real checks.
- `transit` is a dependency graph propagation task that runs before `typecheck`.
- `dev` has no `^dev` dependency because packages are JIT — consumers compile package source directly, so no dependency build step is needed before starting a dev server. See [ODR-0004](../odr/0004-jit-packages.md).
- `oxlint` and `oxfmt` are root-only — both tools traverse the full repo from the root, so per-package tasks are unnecessary. Neither has `dependsOn` since they read source directly, unlike `typecheck` which needs built declarations via `transit`.
- `MODULES` is declared as task-level `env` on the `build` task (not `globalEnv`), scoping cache invalidation to build only.
