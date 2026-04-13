---
name: _adlc-fix
description: |
  Run the ADLC fix pipeline for a PR with outstanding fix issues.
  Use when the user wants to fix issues flagged via @adlc comments on a PR.
  Triggers: "adlc fix", "fix pr", "run adlc fix".
  Accepts a PR number as argument (e.g., /adlc-fix 42).
---

# ADLC Fix — Fix Pipeline Launcher

Launch the ADLC fix pipeline in the background to address issues flagged on a PR.

## Arguments

- `args` — a PR number (e.g. `42` or `#42`). **Required.**

## Process

### 1. Parse the PR number

Strip any leading `#` from the argument. If no argument is provided or it's not a valid number, stop and ask the user to provide a PR number.

### 2. Preview the issues

Use the Bash tool to run:

```
gh issue list --label adlc-fix --state open --json number,title,body,labels --repo patricklafrance/plantz-claude-v3
```

Filter the output to issues that reference the PR. Show the user a summary of which issues will be fixed.

### 3. Spawn the ADLC fix pipeline in the background

Use the **Agent** tool with `run_in_background: true` to spawn a subagent that runs the ADLC fix CLI. The subagent prompt should be:

```
Run the ADLC fix CLI to fix issues on PR #<pr-number>. Execute this command from the repository root:

pnpm exec adlc fix <pr-number>

Monitor the output. If the process exits with a non-zero code, report the error. Otherwise, report that the ADLC fix pipeline completed successfully and summarize any output.
```

Use `mode: "bypassPermissions"` so the pipeline can run autonomously.

### 4. Confirm to the user

After spawning the background agent, immediately tell the user:

> ADLC fix pipeline started in the background for PR #\<number\>.
> Fixing issues: #\<issue1\>, #\<issue2\>, ...
> You'll be notified when it completes. You can continue working on other tasks in the meantime.
