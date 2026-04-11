# Pre-commit

Commit-time validation for `git commit` Bash commands.

This hook intercepts commit attempts and runs a small validation pipeline before allowing the commit to proceed.

It is narrower than `verification` and `supervisor`:

- it only cares about `git commit`
- it runs on `PreToolUse/Bash`
- it validates the repo state before the commit happens

## Why it exists

`pre-commit` turns a commit into a final gate instead of a best-effort action.

Concretely, it improves the harness by:

- preventing commits that skip the repo's baseline validation
- auto-fixing formatting before the commit is evaluated
- keeping `.gitignore` from accidentally re-including ephemeral ADLC artifacts

That makes commit creation less dependent on the agent remembering the exact local validation sequence.

## Hook entrypoint

- `create-pre-commit-hook.ts`
    - Registered on `PreToolUse` for `Bash`
    - Only activates for `git commit` commands

Flow:

1. Parse the incoming Bash command
2. If it is not a `git commit`, allow immediately
3. Run the pre-commit pipeline via `handler.ts`
4. If problems remain, block the command and return the combined failures

## Main handler

- `handler.ts`

Pipeline:

1. `format-fix` → `lint-fix` (sequential)
    - auto-format files, then auto-fix lint errors
    - stage all changes
2. run in parallel:
    - `build`
    - `lint`
    - `tests`
    - `gitignore-check`

The handler returns:

- `[]` -> allow commit
- `string[]` -> block commit

## Files

- `create-pre-commit-hook.ts` — hook factory, regex-matches `git commit` commands
- `handler.ts` — pipeline orchestrator
- `format-fix.ts` — auto-format and stage changes (runs first)
- `lint-fix.ts` — auto-fix lint errors and stage changes (runs after format, before lint check)
- `build.ts` — turbo build check
- `lint.ts` — turbo lint check
- `tests.ts` — turbo test check
- `gitignore-check.ts` — ensures `.gitignore` excludes ADLC artifacts

## Public hook contract

`pre-commit` returns:

- allow:
    - `{ continue: true }`

- block:
    - `decision: "block"`
    - `reason: "Pre-commit checks failed..."`

Only commit commands are intercepted. Other Bash commands pass through untouched.
