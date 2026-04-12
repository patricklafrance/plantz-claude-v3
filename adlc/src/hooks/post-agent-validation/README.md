# Post-Agent Checks

Post-completion checks for ADLC subagents.

This hook runs on `SubagentStop` to validate work before the workflow advances.

It is not a live runtime controller like `supervisor`. It is a stop-time check and cleanup pipeline.

## Why it exists

`post-agent-validation` makes the ADLC workflow materially more reliable by turning agent completion into a gated handoff instead of a trust-based handoff.

Concretely, it improves the harness by:

- preventing an agent from declaring success when required deliverables are still missing
- catching structural problems at the boundary between workflow stages instead of letting them leak downstream
- auto-fixing low-value issues like formatting before they become noisy failures
- pushing concise, actionable failures back to the same agent while its context is still fresh
- recording run metrics so the harness can measure cost, tool usage, and retry behavior over time

Without this hook family, the ADLC loop would depend much more on agents remembering to self-verify and on later stages discovering earlier mistakes by accident.

## Hook entrypoint

- `create-post-agent-validation-hook.ts`
    - Registered on `SubagentStop`
    - Routes by `agent_type`
    - Records run metrics for all agent runs
    - Blocks completion when a handled agent still has problems to fix

High-level flow:

1. Parse the stop-hook input
2. If already in a stop-hook retry cycle (`stop_hook_active`), record metrics and allow through to avoid infinite loops
3. Route to the handler for the current agent type
4. Run that handler's checks / autofixes
5. If problems remain, block and feed them back to the agent
6. If clean, record metrics, archive artifacts, and allow the stop

## Router and shared modules

The main router lives in `create-post-agent-validation-hook.ts`.

Handled agent types:

- `challenge-arbiter`
- `coder`
- `document`
- `domain-mapper`
- `evidence-researcher`
- `placement-gate`
- `plan-gate`
- `planner`
- `reviewer`
- `simplify`

Unhandled agent types are allowed through, but their metrics are still recorded.

Shared modules:

- `create-post-agent-validation-hook.ts` — main router and metrics wiring
- `metrics.ts` — transcript parsing, run-metric recording, and artifact archival
- `utils.ts` — `.adlc` artifact helpers (`hasFile`, `listFiles`, `getChangedFiles`) and shared `run` shell helper

Shared check modules (used by multiple handlers):

- `build-check.ts` — turbo build validation
- `lint-check.ts` — turbo lint validation
- `tests-check.ts` — turbo test validation
- `format-fix.ts` — auto-format and stage changes
- `lint-fix.ts` — auto-fix lint errors (runs after format, before lint check)
- `no-file-disable-check.ts` — rejects file-level lint disable comments
- `import-check.ts` — rejects cross-boundary import violations

## Per-agent handler structure

Each handled agent has its own folder and `handler.ts`.

The handler normally composes a small pipeline of:

- verificators (artifact existence, structural checks)
- autofixers (formatting)
- cleanup steps (port cleanup)

Handlers return:

- `[]` -> allow stop
- `string[]` -> block stop with those problems

## Per-agent details

### `challenge-arbiter`

Checks: `.adlc/current-challenge-verdict.md` must exist.

### `coder`

Pipeline:

1. format-fix → lint-fix (sequential, must complete before checks)
2. parallel: build, lint, tests, file-disable scan, secret scan, import guard, implementation-notes check, story coverage, context refresh
3. kill dev-server ports (always)

### `document`

Checks: format-fix → lint-fix (sequential).

### `domain-mapper`

Checks:

1. `.adlc/domain-mapping.md` must exist
2. after challenge-revision, every medium+ confidence challenge must have a resolution entry

### `evidence-researcher`

Checks: `.adlc/current-evidence-findings.md` must exist.

### `placement-gate`

Checks:

1. must not touch plan files (reads mapping, shouldn't create plans)
2. if `.adlc/placement-gate-revision.md` exists, it must contain `### ISSUE-N` blocks

### `plan-gate`

Checks:

1. must not modify plan files
2. revision feedback must reference at least one slice

### `planner`

Checks:

1. `plan-header.md` must exist
2. at least one slice file must exist in `.adlc/slices/`
3. every slice must contain acceptance criteria
4. every slice must contain a `Reference Packages` section

### `reviewer`

Checks:

1. `verification-results.md` must exist
2. every acceptance criterion from the slice appears in Passed or Failed

### `simplify`

Pipeline:

1. format-fix → lint-fix (sequential, must complete before checks)
2. parallel: build, lint, tests, file-disable scan, import guard

## Run metrics

`metrics.ts` parses each agent transcript JSONL and records:

- model
- token usage (input, output, cache read, cache creation, billable)
- tool counts, token estimates, and durations per tool
- individual tool call detail records
- total wall time
- started/completed timestamps
- draft vs. revision mode detection
- rework stats (revision cycles, affected slices, rework cost)

Metrics are written to `.adlc-logs/{timestamp}_{branch}/run-metrics.json` with per-run detail files in `run-details/`.

Artifact archival happens on successful (problem-free) runs:

- `placement-gate` success: archives `domain-mapping.md` and `challenges/`
- `plan-gate` success: archives `plan-header.md` and `slices/`
- `reviewer` success: archives `verification-results.md` per slice

## Public hook contract

`post-agent-validation` returns:

- allow:
    - `{ continue: true }`

- block:
    - `decision: "block"`
    - `reason: "<agent-specific problems>"`

The returned block reason is intended to be fed back to the same agent so it can fix the listed problems before the workflow continues.
