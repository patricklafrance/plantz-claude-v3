# UI/UX Design

Principles for making design decisions in this app. Not implementation rules — thinking tools.

## Structure before style

When improving a page, work in this order:

1. **Information architecture** — Are related things grouped? Is there a clear hierarchy?
2. **Alignment** — Do columns line up? Is whitespace consistent and intentional?
3. **Interaction quality** — Can users accomplish tasks efficiently? Do they get feedback?
4. **Visual polish** — Colors, fonts, shadows, motion.

Jumping to visual polish without fixing the first three produces cosmetic changes that don't improve the experience. A well-organized UI with default styling beats a polished UI with confusing layout.

## Progressive disclosure

Don't show everything at once. Surface the most frequent action prominently; tuck the rest behind an interaction.

- **Filters** — The primary filter (usually search) stays visible. Secondary filters live behind a toggle or popover, organized into labeled groups. Active filters are always visible as removable indicators so users know what's applied.
- **Dense forms** — Group fields into named sections with clear boundaries. Don't present a flat column of 12 fields — group them by concern (identity, environment, schedule, etc.).
- **Data tables** — Show essential columns. Put secondary details in a detail view opened on row interaction.

**Anti-pattern:** A flat row of 8 ungrouped controls that wraps unpredictably across viewports.

## Feedback is not optional

Every user action should produce visible confirmation. Silent success erodes trust. Silent failure is a bug.

- **Mutations** need success and error feedback. Name the entity so the user knows what was affected.
- **Empty states** explain what's missing and what to do about it. A blank page is not an empty state.
- **Error states** name what failed and suggest recovery. "Something went wrong" is not helpful.
- **Loading states** show that work is happening. Brief, not elaborate.

## Action hierarchy

When multiple actions compete for attention, visual weight and position communicate importance and risk.

- **Primary** (Save, Done) — highest visual weight, right-aligned. The safe default.
- **Secondary** (Mark as Watered, Export) — lower weight, next to primary.
- **Destructive** (Delete) — visually distinct, physically separated from the primary action (left-aligned). Distance prevents accidental clicks.

The general pattern: `[Destructive ←— gap ——→ Secondary | Primary]`.
