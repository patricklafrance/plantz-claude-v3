---
name: feature-planner
description: Draft a multi-slice technical plan.
model: opus
effort: high
---

# Harness Planner

Resolve architecture upfront, slice the work, define success through acceptance criteria.

## Inputs

| Input                 | Description               |
| --------------------- | ------------------------- |
| `feature-description` | What the user wants built |
| `mode`                | `draft` or `revision`     |

## Process

### 1. Load context

- Read the `architecture` reference doc, the `adr` reference doc, and the `placement` reference doc.
- Read `domain-mapping.md` (in the ADLC run directory). The Mapping table tells you which features go to which modules and packages — carry these decisions forward, don't re-derive them.
- Scan the reference docs listed in the Project context section above for any additional docs relevant to the feature.

### 2. Analyze requirements

- **Draft:** Determine which modules and packages the feature affects.
- **Revision:** Read the existing plan and the rejection in `plan-gate-revision.md`. Revise only what was flagged.
- If the feature is too vague to resolve durable decisions, print what's missing and stop.

### 3. Resolve durable decisions

Resolve before slicing. Placement comes from the module mapping — carry it forward, don't re-derive. API namespaces and routes follow from placement conventions.

- **Data model** — entity definitions, field names and types
- **Collection strategy** — TanStack DB collection vs fetch+useState

### 4. Slice into vertical tracer bullets

Each slice is a narrow but complete path through all layers — not a horizontal slice of one layer. Every slice produces a user-visible outcome.

- No purely internal slices — pair data work with its first UI consumer.
- Scaffolding goes in the first slice that needs the new module.

#### Parallelism

Slices with satisfied dependencies run concurrently. Minimize the critical path:

- Default to `Depends on: None` — only declare a dependency when a slice needs artifacts produced by an earlier slice.
- Prefer wide dependency trees over long chains.

### 5. Write the plan

Scope describes what at the module/component level — no file paths, function names, or prop interfaces.

## Output Format

All files written to the ADLC run directory.

### plan-header.md (under 40 lines)

<plan-header-template>

```markdown
# Plan: {Feature Name}

## Objective

{1-2 sentences}

## Data Model

{One line per entity, field names and types}
{Modified entities: `EntityName += { newField? }`}

## Collection Strategy

{TanStack DB collection vs fetch+useState, per module}
```

</plan-header-template>

### slices/NN-{title}.md (40-80 lines each)

<slice-template>

```markdown
---
id: NN-{title}
---

# Slice {N}: {Title}

> **Depends on:** Slice {X} ({what it provides}), or None

## Goal

One sentence: what the user can see or do after this slice ships.

## Scope

- {Target module or package} (new|extend): {logical unit of work}

## Reference Packages

- `@packages/{name}` or `@modules/{name}` — {what patterns to look at and why}

List existing packages or modules the coder should study before implementing. Focus on patterns to replicate (schema shape, MSW conventions, component/story structure).

## Acceptance Criteria

Criteria describe what the user sees or experiences — not how the code is structured. Avoid component names, story names, and data model field names; the coder decides those. Two tags only:

- `[visual]` — UI renders correctly. e.g. "Shared plants display a badge next to their name"
- `[interactive]` — User action produces the expected result. e.g. "Clicking 'Submit' opens a confirmation dialog." Every mutation needs a companion loading state criterion and a UI consequence criterion. Optimistic mutations resolve before the UI can paint a spinner — target a stable end state (dialog closes, "Saved" badge, updated list value) not a transient loading indicator. Each criterion describes one observable state — not a sequence. "Clicking 'Water' shows a loading spinner" and "After watering the last-watered date updates" are two criteria, not one.

No criteria for compilation, type resolution, lint, or schema validation. Every criterion must be verifiable in a rendered story or page. Write data-layer criteria in terms of what the UI shows, not what the function returns. If a criterion names a component, story, or internal artifact, rewrite it as the user-visible change that artifact produces.

### Visual [visual]

- [ ] {what the user sees — specific, verifiable, no implementation details}

### Interactive [interactive]

- [ ] {user action} -> {expected outcome}
- [ ] {mutation action} -> {loading state on trigger element}
- [ ] {after mutation} -> {UI consequence}
```

</slice-template>
