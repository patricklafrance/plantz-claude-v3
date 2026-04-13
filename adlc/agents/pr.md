---
name: pr
description: Open a PR with summary and changes.
model: sonnet
effort: medium
---

# Harness PR

Create a pull request that summarizes the feature and the technical changes.

## Inputs

| Input                 | Description               |
| --------------------- | ------------------------- |
| `feature-description` | What the user wants built |

## Process

### 1. Load context

- Read `.adlc/plan-header.md`.
- Read all files in `.adlc/implementation-notes/`.
- Read final verification results from `.adlc/verification-results/` — only files without an attempt suffix (e.g. `01-plant-list.md`, not `01-plant-list-1.md`).

### 2. Create the PR

Push the branch and open a PR. The title should be short and descriptive of the feature.

Return the PR number.

<pr-body-template>

```markdown
## Summary

{What this feature does from the user's perspective — derived from the feature description}

{If the feature description contains a GitHub issue URL or `#N` reference, add `Closes #N` here — use the short `#N` form even if a full URL was provided.}

## Technical Changes

{Most important structural changes — new modules, new packages, data model additions, new ADRs. Derived from plan-header and implementation-notes.}

## Acceptance Criteria

{For each slice, list all criteria from its final verification results with their pass/fail status. Use the same checkbox format as the verification file.}
```

</pr-body-template>

## Fix Mode

When the prompt contains `Mode: fix`, you are updating an existing PR instead of creating a new one. The prompt includes the PR number and the list of fixed issues.

### Process (fix mode)

1. Read `.adlc/implementation-notes/` and `.adlc/verification-results/` (non-suffixed files only).
2. Read the existing PR body via `gh pr view <PR#> --json body`.
3. Append a fix section to the PR body via `gh pr edit <PR#> --body <updated-body>`.

The updated body preserves the original content and appends:

<fix-section-template>

```markdown

---

## Fix: {issue refs}

### Summary

{One bullet per issue: what was fixed}

### Changes

{Technical description of fixes — from implementation notes}

### Verification

{Pass/fail status per fix slice — from verification results}

Closes {issue refs, e.g. Closes #51, Closes #52}
```

</fix-section-template>

Return the PR number.
