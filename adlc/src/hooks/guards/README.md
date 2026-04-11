# Guards

Stateless `PreToolUse` guardrails and command rewrites.

`guards` sits before execution and blocks known bad command and read patterns.

Unlike `supervisor`, it does not manage recovery contracts or runtime history.

## Why it exists

Guards were added after repeated examples of agents wasting time on bad command forms before any higher-order supervision was needed.

The recurring patterns were:

- package-manager drift such as `npx` and `pnpm dlx` when the repo expects `pnpm exec`
- Windows `cmd /c` fallbacks that turned Bash execution into an inconsistent mix of shells
- repeated bare full-workspace `pnpm typecheck` runs when a filtered check or `pnpm lint` would have been the better move
- dependency-source spelunking inside `node_modules` instead of using public APIs, type definitions, or docs

Those are all immediate input-level problems, so they belong in a stateless pre-execution hook.

## Hook entrypoint

- `create-guards-hook.ts`
    - Registered on `PreToolUse`
    - Handles `Bash`, `Read`, and `Glob`

Flow:

1. Parse the incoming tool call
2. Run deterministic block guards in order
3. Return either:
    - `{ continue: true }` -> allow
    - `decision: "block"` -> reject

## Why it is separate from `supervisor`

`guards` is intentionally stateless.

It is for immediate, local rules such as:

- this command form is disallowed
- this path should not be read
- this command should be rewritten before execution

It is not responsible for:

- repeated behavior over time
- recovery loops
- per-run autonomy control
- evidence-based install gating

Those belong to `supervisor`.

## Files

- `create-guards-hook.ts` — hook factory, runs guards in order
- `utils.ts` — shared command splitting and path helpers
- `block-npm.ts` — blocks `npm`, `npx`, `pnpx`, and `pnpm dlx`
- `block-windows-cmd.ts` — blocks `cmd /c` and `cmd //c`
- `block-node-modules-read.ts` — blocks `Read` and `Glob` access to `node_modules` (type definitions allowed); blocks Bash inspection commands into `node_modules`

## Block rules

### Package-manager rules

Blocked:

- `npm`
- `npx`
- `pnpx`
- `pnpm dlx`

Reason:

- enforce consistent `pnpm` / `pnpm exec` usage

### `cmd` rule

Blocked:

- `cmd /c ...`
- `cmd //c ...`

Reason:

- avoid falling back into Windows `cmd` wrappers
- keep Bash command handling consistent

### `node_modules` read rule

Blocked:

- `Read` on paths inside `node_modules` (except type definitions)
- `Glob` patterns targeting `node_modules` (except patterns targeting type definitions)
- Bash inspection commands targeting `node_modules` (`rg`, `grep`, `find`, `cat`, `ls`)

Allowed:

- `Read` on type definition files (`.d.ts`, `.d.mts`, `.d.cts`) inside `node_modules`
- `Glob` patterns ending in `.d.ts`, `.d.mts`, or `.d.cts` that target `node_modules`

Reason:

- prevent dependency-source spelunking during implementation
- `.d.ts` files are explicitly allowed because they are the public type contract

## Public hook contract

`guards` only returns two shapes:

- allow:
    - `{ continue: true }`

- block:
    - `decision: "block"`
    - `reason: "<message>"`

It does not write `.adlc` state and does not append event logs.
