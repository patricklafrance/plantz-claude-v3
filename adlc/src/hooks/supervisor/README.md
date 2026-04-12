# Supervisor

Stateful real-time supervision for Claude Code tool execution.

This hook family sits on the live execution path and enforces runtime reliability rules during a run, not after it.

## Why it exists

`supervisor` was added because some failure modes were not input problems; they only became obvious over time during execution.

The recurring patterns were:

- browser-debugging spirals with too many screenshots or browser calls in a row
- agents running far too long without completing, burning tokens in loose spirals
- blind `pnpm install` retries used as a generic recovery move
- test-command spirals where agents re-run tests without making code changes

These were not well handled by static guardrails alone. They needed:

- rolling state
- live intervention during execution
- wall-clock circuit breakers for runaway agents

## Hook entrypoints

- `create-supervisor-pre-tool-hook.ts`
    - Registered on `PreToolUse`
    - Handles all tool types
    - Enforces wall-clock breaker, install gating, browser-thrash, and test-thrash policies

- `create-supervisor-post-tool-hook.ts`
    - Registered on `PostToolUse` for `Bash`
    - Records narrow evidence from command results
    - Currently used for `pnpm install` bypass evidence

- `create-supervisor-hooks.ts`
    - Factory that creates shared in-memory state and wires both hooks

## Runtime model

The supervisor operates as a control loop:

1. Observe the next tool call
2. Build an event from the tool call metadata
3. Apply the event to rolling in-memory state
4. Check wall-clock circuit breaker (highest priority)
5. Apply special gates like `pnpm install`
6. Evaluate runtime policies (browser-thrash, test-thrash)
7. Return allow or block

The main rule is:

- state-transition steps mutate context
- policy steps return decisions
- the first policy that returns a block wins

## State model

Core supervisor state (browser-thrash counters, test-thrash counters, wall-clock timestamps, install bypass tokens) is **in-memory** — created fresh per `createSupervisorHooks()` call and lives for the duration of the agent run. No event JSONL logs or persistent state files.

The install-gate is the exception: it reads `.adlc/allow-install` from disk and runs `git diff` to check manifest changes on every install attempt.

## Files

- `create-supervisor-hooks.ts` — factory, creates shared state and returns both hooks
- `create-supervisor-pre-tool-hook.ts` — PreToolUse policy chain
- `create-supervisor-post-tool-hook.ts` — PostToolUse install-bypass scanner
- `state.ts` — state types and `createDefaultState()` / `applyEventToState()`
- `event-builder.ts` — builds normalized events from tool call metadata
- `wall-clock.ts` — wall-clock circuit breaker policy
- `browser-thrash.ts` — browser-debugging spiral detection
- `test-thrash.ts` — test-without-edit spiral detection
- `install-gate.ts` — evidence-based install gating

## Policies

### `wall-clock`

Purpose:

- detect and stop agents that run too long without completing
- the only reliable signal for "loose spiral" failure patterns where agents vary their commands enough to evade micro-pattern detection

Behavior:

- on first PreToolUse event, store `startedAt` timestamp in state
- on every subsequent event, compute elapsed time
- **nudge (T1):** block ONE tool call with a reflection prompt, set `nudgeFired` flag, allow subsequent calls
- **hard stop (T2):** block ALL tool calls, agent returns to coordinator
- different thresholds per agent type
- state resets naturally between agent runs (new `createDefaultState()` call)

Per-agent thresholds (nudge / hard stop):

| Agent               | Nudge (T1)                      | Hard Stop (T2) |
| ------------------- | ------------------------------- | -------------- |
| coder               | disabled                        | 30 min         |
| reviewer            | 10 min                          | 15 min         |
| explorer            | 5 min                           | 8 min          |
| planner             | 5 min                           | 8 min          |
| plan-gate           | 5 min                           | 8 min          |
| domain-mapper       | 5 min                           | 8 min          |
| pr                  | 5 min                           | 8 min          |
| document            | 5 min                           | 8 min          |
| evidence-researcher | 3 min                           | 5 min          |
| placement-gate      | 3 min                           | 5 min          |
| monitor             | exempt (has own 30-min timeout) |                |
| default             | 10 min                          | 15 min         |

### `browser-thrash`

Purpose:

- reduce browser-debugging spirals

Behavior:

- first screenshot command gets a nudge toward DOM-based inspection
- block after consecutive browser calls exceed density threshold
- block after total browser calls exceed budget

Why this was added:

- browser-heavy reviewer and coder runs were spending too many steps on screenshots and repeated browser retries
- the issue was not browser usage itself, but browser usage without enough source- or log-based diagnosis between attempts

### `test-thrash`

Purpose:

- detect test-command spirals where the agent re-runs test suites without making code changes between runs

Behavior:

- track consecutive test commands without an intervening Edit/Write (edit-gap)
- **nudge** after consecutive test runs without edits — block one call with recovery guidance, require edits before next test
- **escalation** if the pattern continues — stronger guidance, require more edits
- **budget cap** on total test commands per agent run — hard stop

Why this was added:

- agents were re-running test suites with different grep/tail filters instead of reading failure output and editing code
- the primary signal is "consecutive test commands without an intervening Edit/Write" (edit-gap), not density

### `install-gate`

Purpose:

- stop blind `pnpm install` / `pnpm i` retries
- still allow legitimate dependency-sync recovery

Behavior:

- block install by default
- allow automatically when:
    - `package.json` or `pnpm-lock.yaml` differs from `HEAD`
    - a one-shot evidence bypass token is active (from PostToolUse)
    - a run-scoped manual override exists at `.adlc/allow-install`

Evidence bypass:

- the PostToolUse hook scans Bash output for high-signal dependency-sync failures (e.g. `ERR_PNPM_OUTDATED_LOCKFILE`, missing package imports)
- bypass is one-shot and expires after a short event window if unused
- intentionally narrow: rejects relative imports, alias-style imports, generic type errors

## Public hook contract

- `allow` decisions return `{ continue: true }`
- `block` decisions include a reason string and `hookSpecificOutput` with deny details
