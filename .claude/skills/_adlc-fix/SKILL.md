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

### 2. Fetch and compose issues

Use the Bash tool to run:

```
gh issue list --label adlc-fix --state open --json number,title,body,labels --repo patricklafrance/plantz-claude-v3
```

Filter the JSON output to issues whose `body` contains a reference to the PR (either `#<pr-number>` or the full PR URL `https://github.com/patricklafrance/plantz-claude-v3/pull/<pr-number>`).

If no matching issues are found, stop and tell the user there are no open `adlc-fix` issues linked to that PR.

Compose a **description string** by concatenating each matching issue using this template, separated by blank lines:

```
Issue #<number>: <title>
Link: https://github.com/patricklafrance/plantz-claude-v3/issues/<number>

<body>
```

Show the user a summary of which issues will be fixed.

### 3. Run the ADLC fix pipeline

Use the **Bash** tool to run the ADLC fix CLI directly from the repository root. Use a long timeout (600000ms) since the pipeline takes time to complete:

```
pnpm exec adlc fix <pr-number> "<composed-description>"
```

If the process exits with a non-zero code, report the error. Otherwise, report that the ADLC fix pipeline completed successfully and summarize any output.

### 4. Confirm to the user

After the pipeline completes, tell the user the result:

> ADLC fix pipeline completed for PR #\<number\>.
> Fixed issues: #\<issue1\>, #\<issue2\>, ...
