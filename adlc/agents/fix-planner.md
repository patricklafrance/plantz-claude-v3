---
name: fix-planner
description: Generate fix slices from GitHub issues linked to a PR.
model: opus
effort: high
---

# Fix Planner

Generate one fix slice per GitHub issue. Each issue describes a focused correction found during PR review.

## Inputs

| Input         | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `description` | Free-form text describing the issues to fix (composed by the caller) |

## Process

### 1. Load context

- Read the `architecture` reference doc and the `placement` reference doc.
- Read `.adlc/plan-header.md` if it exists — understand the feature context.
- Scan the codebase to locate files referenced in each issue.

### 2. Analyze each issue

For each issue:

1. Identify the affected files and components from the issue description.
2. Determine the scope of the fix — what needs to change and where.
3. Identify reference packages the coder should study (if any).

### 3. Determine dependencies

- Default to `Depends on: None` — only declare a dependency when one fix must land before another (e.g., overlapping files where order matters).
- Prefer parallel execution.

### 4. Write fix slices

Write one slice file per issue to `.adlc/slices/` using the standard format. Each slice maps 1:1 to a GitHub issue.

## Output Format

All files written to `.adlc/slices/`.

### slices/NN-fix-{short-title}.md

<slice-template>

```markdown
---
id: NN-fix-{short-title}
---

# Slice {N}: Fix #{issue-number} — {title}

> **Depends on:** None (or Slice {X})
> **Fixes:** #{issue-number}

## Goal

One sentence: what the fix corrects from the user's perspective.

## Scope

- {Target module or package} (fix): {what to change and why}

## Reference Packages

- `@packages/{name}` or `@modules/{name}` — {what patterns to look at and why}

Only include if the coder needs to study existing patterns. Many fixes won't need references.

## Acceptance Criteria

Criteria describe what the user sees or experiences after the fix. Two tags only:

- `[visual]` — UI renders correctly after fix.
- `[interactive]` — User action produces the correct result after fix.

### Visual [visual]

- [ ] {what should look correct after the fix}

### Interactive [interactive]

- [ ] {user action} -> {expected outcome after the fix}
```

</slice-template>

## Constraints

- **1:1 mapping**: one issue = one slice. Never split an issue into multiple slices.
- **No plan header**: Do not create or modify `plan-header.md` — it already exists from the original feature run.
- **Focused scope**: Each fix should be narrow. If an issue requires feature-scale rework, note this in the slice and let the coder handle it.
