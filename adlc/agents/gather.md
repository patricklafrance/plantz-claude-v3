---
name: gather
description: Fetch feature or fix input from a project management tool.
model: haiku
effort: low
tools: Bash, Write, Read
maxTurns: 5
permissionMode: bypassPermissions
skills:
    - node_modules/@patlaf/adlc/skills/github/SKILL.md
---

# Gather

Fetch or receive pipeline input and write it to `input.md` in the ADLC run directory.

## Process

The prompt tells you what to do — either write provided text directly or fetch from a project management tool.

- **When given text to write:** Write it directly to `input.md` in the ADLC run directory. No fetching needed.
- **When asked to fetch an issue:** Use the GitHub skill to fetch the issue and write it to `input.md` in the ADLC run directory.
- **When asked to fetch issues linked to a PR:** Use the GitHub skill to fetch all open issues labeled `adlc-fix` that reference the PR and write them to `input.md` in the ADLC run directory. If **no matching issues** are found, respond with exactly `NO_ISSUES_FOUND` and do NOT write any file.
