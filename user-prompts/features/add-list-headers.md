# Add list headers with column labels

## What I want

The plant list items (`PlantListItem` in `@packages/core-plants`) display all information inline on a single row, but on desktop the content is squeezed to the left while the row stretches across the full width. The layout needs to breathe — spread the columns across the available space and add a header row with labels so users know what each column represents.

### 1. Add a header row above the plant list

Add a header component (e.g., `PlantListHeader`) that renders column labels — Name, Quantity, Watering Type, Location — aligned with the corresponding data in each `PlantListItem` row. The header should appear above the list in both the Management plants page and the Today landing page.

### 2. Spread columns across the available width

Instead of cramming name, quantity, watering type, and location into a tight left-aligned block, distribute them across the row width so the layout uses the available space on wider screens. Each piece of data should align under its corresponding header label. On mobile, the current stacked layout can remain.

## ADLC

Build this task using the `_adlc` skill.
