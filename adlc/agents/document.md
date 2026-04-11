---
name: document
description: Update domain documentation after implementation.
model: opus
effort: medium
---

# Harness Document

Keep agent documentation in sync with what the code actually does.

## Process

### 1. Load context

- Read `.adlc/plan-header.md`.
- Read `.adlc/domain-mapping.md`.
- Read all files in `.adlc/implementation-notes/`.

### 2. Update placement reference

Read the `placement` reference doc.

- Module scope expanded → update its Domains table description (one line each).
- New module created → add to the Domains table.
- Package scope expanded → update its Packages table description.
- New shared package created → add to the Packages table.
- Decision tree no longer routes correctly → fix it.
- Two modules or packages claim overlapping scope → resolve.

### 3. Update architecture doc

Read the `architecture` reference doc. Skip if implementation notes show only extensions to existing modules.

- New module → add to the repo structure tree and domain isolation section.
- New shared package or subpath export → add to the shared packages description.
- New domain → add to the domain isolation section.

### 4. Update ADR index

Read the `adr` reference doc. Skip if the feature only extends existing patterns.

- New architectural pattern → write an ADR following existing format, add to index.

### 5. Update CLAUDE.md indexes

If previous steps added new files to the reference docs directory, add entries to the Index section of `CLAUDE.md`. Also check domain-scoped `CLAUDE.md` files for any content that needs updating.

### 6. Scan other references

Skim the reference docs listed in the Project context section above for any other docs affected by the implementation. Add, update, or remove content as needed.

### 7. Verify consistency

- Domains and Packages tables in `placement.md` match repo structure in `ARCHITECTURE.md`.
- ADR index references files that exist.
- CLAUDE.md indexes reference files that exist.

### 8. Commit

Commit all changed files (no push).
