# Static Analysis

Five tools run on every `pnpm lint` and in CI. All are root-level Turborepo tasks except `typecheck` (per-package).

| Tool     | Task                         | What it checks                                                |
| -------- | ---------------------------- | ------------------------------------------------------------- |
| oxlint   | `//#lint-check`              | JS/TS bugs, accessibility, perf anti-patterns                 |
| oxfmt    | `//#format-check`            | Code formatting (Prettier-compatible, Tailwind class sorting) |
| tsgo     | `typecheck` + `//#typecheck` | Type safety across all packages                               |
| syncpack | `//#syncpack`                | Dependency version consistency (apps pin, packages use `^`)   |
| knip     | `//#knip`                    | Unused files, dependencies, and exports                       |

## Suppression policy

Never suppress a finding without first investigating the root cause. Fix the code — suppression is a last resort for genuine false positives only.

**Decision order when a tool reports an issue:**

1. **Fix the code.** The tool is almost always right.
2. **Adjust configuration** (e.g., add a knip `entry` point so the tool can trace the dependency). This teaches the tool, not silences it.
3. **Suppress as last resort.** Only when the tool has a genuine blind spot (string-based plugin references, cross-workspace Storybook globs, type-only peer dep imports).

**Per-tool suppression:**

- oxlint: `// oxlint-disable-next-line <rule>` with a justification comment. Never file-level.
- knip: `ignoreDependencies` in `knip.json`. Prefer adding `entry` points over ignoring. See [ODR-0005](../odr/0005-knip-dead-code-detection.md).
- syncpack: overrides in `.syncpackrc.js`. See [ODR-0002](../odr/0002-dependency-versioning-syncpack.md).
- oxfmt: no suppression — fix the formatting.
- tsgo: no `@ts-ignore` or `@ts-expect-error` — fix the types.
