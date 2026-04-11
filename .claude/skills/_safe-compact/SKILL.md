---
name: _safe-compact
description: Save a curated session context backup before compaction. Use instead of /compact to avoid losing context.
license: MIT
---

# Safe Compact

Save a curated context summary so it survives compaction.

## Process

### 1. Write the context backup

Write a markdown file to `tmp/pre-compact.md` (create the directory if needed).

The file must capture everything needed to resume work after compaction:

```markdown
# Session Context Backup

## What was done
- Bullet list of completed work this session

## Key decisions
- Important choices made and why

## Current state
- Files changed (with paths)
- Relevant configuration or settings state
- Any open issues or errors encountered

## What's next
- Immediate next steps
- Any pending tasks or blockers
```

Be thorough but concise. Focus on information that cannot be derived from the code alone — decisions, intent, failed approaches, and context behind choices.

### 2. Confirm to the user

After writing the file, tell the user:

> Context saved to `tmp/pre-compact.md`. You can now run `/compact` — the backup will be auto-restored.
