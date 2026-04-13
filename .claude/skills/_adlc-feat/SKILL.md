---
name: _adlc-feat
description: |
  Start the ADLC feature pipeline for a GitHub issue.
  Use when the user wants to kick off the full agent pipeline to implement a feature from a GitHub issue.
  Triggers: "adlc feat", "start adlc", "run adlc", "implement issue", "adlc feature".
  Accepts a GitHub issue number as argument (e.g., /adlc-feat 42).
---

# ADLC — Agent-Driven Lifecycle Launcher

Launch the ADLC multi-agent pipeline from a GitHub issue.

## Arguments

- `args` — a GitHub issue number (e.g. `42` or `#42`). **Required.**

## Process

### 1. Parse the issue number

Strip any leading `#` from the argument. If no argument is provided or it's not a valid number, stop and ask the user to provide a GitHub issue number.

### 2. Read the GitHub issue

Use the Bash tool to run:

```
gh issue view <number> --repo patricklafrance/plantz-claude-v3
```

Extract the **title** and **body** from the output. These form the feature description for the ADLC pipeline.

### 3. Compose the feature description

Build a feature description string from the issue:

```
Issue #<number>: <title>

<body>
```

### 4. Run the ADLC pipeline

Use the **Bash** tool to run the ADLC CLI directly from the repository root. Use a long timeout (600000ms) since the pipeline takes time to complete:

```
pnpm exec adlc feat "<feature-description>"
```

If the process exits with a non-zero code, report the error. Otherwise, report that the ADLC pipeline completed successfully and summarize any output.

### 5. Confirm to the user

After the pipeline completes, tell the user the result:

> ADLC pipeline completed for issue #\<number\>: "\<title\>".
