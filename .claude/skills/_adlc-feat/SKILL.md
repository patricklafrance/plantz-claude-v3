---
name: _adlc-feat
description: |
  Start the ADLC feature pipeline for a GitHub issue.
  Use when the user wants to kick off the full agent pipeline to implement a feature from a GitHub issue.
  Triggers: "adlc feat", "start adlc", "run adlc", "implement issue", "adlc feature".
  Accepts a GitHub issue number as argument (e.g., /adlc-feat 42).
---

# ADLC — Agent-Driven Lifecycle Launcher

Launch the ADLC multi-agent pipeline in the background from a GitHub issue.

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

### 4. Spawn the ADLC pipeline in the background

Use the **Agent** tool with `run_in_background: true` to spawn a subagent that runs the ADLC CLI. The subagent prompt should be:

```
Run the ADLC CLI to implement the following feature. Execute this command from the repository root:

pnpm exec adlc feat "<feature-description>"

Monitor the output. If the process exits with a non-zero code, report the error. Otherwise, report that the ADLC pipeline completed successfully and summarize any output.
```

Use `mode: "bypassPermissions"` so the pipeline can run autonomously.

### 5. Confirm to the user

After spawning the background agent, immediately tell the user:

> ADLC pipeline started in the background for issue #\<number\>: "\<title\>".
> You'll be notified when it completes. You can continue working on other tasks in the meantime.
