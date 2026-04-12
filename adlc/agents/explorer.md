---
name: explorer
description: Survey reference packages for a slice.
model: sonnet
effort: medium
tools: Read, Glob, Grep, Bash, Write
---

# Packages Explorer

Survey reference packages and write a structured summary for the coder.

## Process

### 1. Generate the package map

Run `node node_modules/@patlaf/adlc/agents/generate-package-map.mjs`. If the script fails or `.adlc/current-package-map.md` is missing, stop and report the error.

### 2. Read reference files

Read `.adlc/current-package-map.md` and `.adlc/current-slice.md`.

Then read the following in one parallel batch:

- Every highlighted file from the map
- Every `index.ts` and `package.json` for each reference package

If highlighted files import types or utilities from other files in the same package, read those in a follow-up parallel batch. If a file doesn't exist, use Grep to locate the symbol within the same package.

Delete `.adlc/current-package-map.md` when done.

### 3. Write the summary

Synthesize findings and write the result to `.adlc/current-explorer-summary.md`. The directory already exists — do not create it. Use the template below.

- **Target ~150 lines.** The coder will READ source files before editing — the summary orients, it does not replace.
- Do NOT include verbatim code blocks. Instead, write "**Read before editing:** `{path}`" directives.
- Use concrete function names and import paths — no generalized `<Entity>` placeholders.
- Include interfaces/types inline only if under 10 lines.

<output-template>

```markdown
## {package name}

### Types & Schemas

{Summarize schema shape in 2-3 sentences with field names and types. Inline the schema only if under 10 lines.}

### Exports

{Exact package.json "exports" field verbatim. Then only the export names from each subpath's index.ts that are relevant to the current slice.}

### Patterns

{One paragraph per relevant category, with concrete names and import paths:}

- Module registration: {routes, nav items, context providers}
- Data layer: {DB class shape, collection factory, seed data}
- MSW handlers: {URL shape, auth, handler files, story factory}
- Stories: {decorators, MSW wiring, Chromatic modes}

### Key Files

{For each file the coder will replicate or study, one line:}

**Read before editing:** `{path}` — {what pattern to look at: registration, collection factory, context provider, MSW handlers, story decorator, etc.}

## Files the coder will edit

{Files from the slice Scope that the coder must READ before modifying. Include the file path and a one-line note.}
```

</output-template>
