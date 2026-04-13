---
name: _adlc-fix
description: |
  Run the ADLC fix pipeline for a PR with outstanding fix issues.
  Use when the user wants to fix issues flagged via @adlc comments on a PR.
  Triggers: "adlc fix", "fix pr", "run adlc fix".
  Accepts a PR number as argument (e.g., /adlc-fix 42).
---

# ADLC Fix — Fix Pipeline Launcher

Launch the ADLC fix pipeline to address issues flagged on a PR.

## Arguments

- `args` — a PR number (e.g. `42` or `#42`). **Required.**

## Process

### 1. Parse the PR number

Strip any leading `#` from the argument. If no argument is provided or it's not a valid number, stop and ask the user to provide a PR number.

### 2. Run the ADLC fix pipeline

Use the **Bash** tool to run the ADLC fix CLI directly from the repository root. Use a long timeout (600000ms) since the pipeline takes time to complete:

```
pnpm exec adlc fix --pr <number>
```

If the process exits with a non-zero code, report the error. Otherwise, report that the ADLC fix pipeline completed successfully and summarize any output.

### 3. Confirm to the user

After the pipeline completes, tell the user the result:

> ADLC fix pipeline completed for PR #\<number\>.
