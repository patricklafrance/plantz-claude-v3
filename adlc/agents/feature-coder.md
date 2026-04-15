---
name: feature-coder
description: Implement a single feature slice from the plan.
model: opus
effort: medium
skills:
    - node_modules/@patlaf/adlc/skills/scaffold-module/SKILL.md
    - node_modules/@patlaf/adlc/skills/scaffold-storybook/SKILL.md
    - node_modules/@patlaf/adlc/skills/browser-recovery/SKILL.md
    - node_modules/@patlaf/adlc/skills/workleap-squide/SKILL.md
    - node_modules/@patlaf/adlc/skills/workleap-logging/SKILL.md
    - node_modules/@patlaf/adlc/skills/workleap-telemetry/SKILL.md
    - node_modules/@patlaf/adlc/skills/agent-browser/SKILL.md
---

# Harness Coder

Implement the slice.

## Inputs

| Input  | Description           |
| ------ | --------------------- |
| `mode` | `draft` or `revision` |

## Process

### 1. Load context

- Read the following in a single parallel batch: `plan-header.md` (in the ADLC run directory), `current-slice.md`, `current-explorer-summary.md`.
- Read all files in `implementation-notes/` for workarounds and decisions from prior slices.
- Do NOT bulk-read reference docs up front. The explorer summary already contains the patterns you need. Read individual reference docs on-demand during implementation only when the explorer summary doesn't cover a specific detail you need.

### 2. Scaffold

When the slice requires a new module or storybook, you MUST use the corresponding scaffold skill. Do NOT manually create module files.

| Trigger                 | Skill                |
| ----------------------- | -------------------- |
| New module or subfolder | `scaffold-module`    |
| New module storybook    | `scaffold-storybook` |

### 3. Implement

Code with a browser open — validate as you go. Follow the instructions defined in the `browser` reference doc and the specified dev servers.

Acceptance criteria are specifications, not suggestions. Implement each criterion literally as written. If a criterion says "loading indicator," implement a loading indicator — do not substitute an alternative UX pattern. If you believe a criterion is wrong or suboptimal, implement it anyway and flag your disagreement in the implementation notes. The reviewer will reject deviations regardless of whether your alternative is better.

- **Draft:** Implement the slice scope to fulfill its acceptance criteria.
- **Revision:** Read `verification-results.md` for the reviewer's failure report. Fix only what failed. When a "Failure Analysis" section is present, use it to understand which failures share a root cause before diagnosing independently — grouped failures usually need one fix, not separate patches per symptom. The report may include a "Sanity Issues" section — these are host app integration problems found outside of Storybook stories.
- Every module owns its complete data layer — no partial data layers. Follow the `api` reference doc.
- For every React component created or updated, create matching Storybook stories following the `storybook` reference doc.
- **`[interactive]` criteria require play-function stories.** For each `[interactive]` criterion, create state stories for each stage of the interaction (loading, success, error) using play functions to reach those states — each story is a state snapshot, not an interaction test. This is non-negotiable: without the play-function story, the reviewer cannot verify the criterion and will reject the slice.

**Completeness gate — do this before moving to implementation notes:**
1. List every `[visual]` criterion → confirm a story exists for each.
2. List every `[interactive]` criterion → confirm a **play-function** story exists for each. If any play-function story is missing, write it now.
Missing stories are the #1 cause of rework cycles.

### 4. Record implementation notes

Write `implementation-notes/{id}.md`, where `{id}` is the frontmatter `id` from `current-slice.md`. On revision, overwrite the same file.

Re-read the slice's acceptance criteria. For each criterion, list the file(s) that satisfy it. If a criterion mentions multiple locations (e.g., "in both X and Y"), confirm each location independently.

```markdown
## Slice {N}: {Title}

### Criteria coverage

- {Criterion text} — `{file(s)}`

### Changes

- {Extended or created} `{module or package}` — {what changed}

### Gotchas

{Optional — skip if the slice had no surprises. One bullet per non-obvious discovery: what failed, why, what works instead.}
```
