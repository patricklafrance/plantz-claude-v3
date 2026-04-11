# Add Plant Care History and Insights Feature

## Goal

Add a **Plant Care History and Insights** feature that allows users to review past plant care activities and understand how their care habits affect plant health.

The feature should record plant care events and present them in ways that help the user answer questions such as:

- When was this plant last watered?
- How regularly am I watering this plant?
- Have I missed watering schedules recently?
- Is this plant receiving consistent care?

The goal is to provide **visibility and feedback** about plant care over time.

---

# Context

The application currently helps users determine **what plants need watering today**.

However, users may also want to understand:

- their past care habits
- whether they are watering plants consistently
- how plant schedules evolve over time

The history and insights feature introduces the ability to **record and analyze care events**.

---

# User Workflows

## View Plant History

A user should be able to open a plant and see its **care history**.

The history should show events such as:

- watering
- skipped watering
- delegated watering
- other relevant care actions

The user should be able to see the **date of each event**.

---

## View Care Timeline

The system should display the sequence of past events in chronological order.

This allows users to understand how often the plant has been watered and whether schedules are consistent.

The timeline should help the user quickly answer:

- When did I last water this plant?
- How often has this plant been watered recently?

---

## View Care Insights

The system should derive simple insights from the history of events.

Examples include:

- average watering interval
- longest gap between watering events
- watering consistency
- streaks of on-time watering

These insights should help the user understand patterns in their care routine.

---

# Domain Concepts

## Care Event

A care event represents an action performed on a plant.

Examples include:

- watering
- skipping watering
- delegated watering
- other care actions that may be added later

Each event should include:

- event identifier
- plant identifier
- event type
- event date
- optional notes
- metadata if needed

---

## Event Types

Initial event types may include:

Watered
Represents a watering action performed by the user.

Skipped
Represents a watering task that was intentionally skipped.

Delegated
Represents watering performed by another person.

Additional event types may be introduced in the future.

---

## Care Insight

Insights are derived observations based on past events.

Examples include:

- average watering interval
- time since last watering
- missed watering count
- consistency score
- watering streak

These values help summarize the care history of a plant.

---

# Insight Calculations

Insights should be derived from past events.

Examples include:

Average Watering Interval
Average number of days between watering events.

Time Since Last Watering
Number of days since the most recent watering event.

Consistency Score
A qualitative indicator of how closely watering events match the expected schedule.

Watering Streak
Number of consecutive watering events performed within an acceptable schedule window.

---

# User Interface Expectations

## Plant Details Page

The plant details screen should include a **history section**.

The section should show:

- a timeline of past care events
- event types and dates
- optional notes

The most recent events should appear first.

---

## Insights Section

The plant details page should also include an **insights area** summarizing care patterns.

Examples of displayed information:

- last watered date
- average watering interval
- watering streak
- missed watering count

The goal is to provide a quick overview of plant care behavior.

---

## History Navigation

Users should be able to:

- scroll through past events
- view details of a specific event
- optionally add notes to events

Events should be presented in a clear chronological structure.

---

# Relationship With Existing Features

The history system should integrate with the watering workflow.

When a user completes a watering task, a **care event** should be recorded automatically.

Similarly, skipping or delegating watering should generate appropriate events.

This ensures that the history reflects actual user behavior.

---

# Validation Rules

Basic validation should ensure:

- event dates are valid
- events are associated with an existing plant
- event types are recognized

Notes are optional and may be empty.

---

# Edge Cases

The system should handle situations such as:

- plants with no history yet
- multiple events on the same day
- manually added events in the past
- plants with irregular watering schedules
- extremely long gaps between events

The system should remain robust even when history data is sparse.

---

# Non Goals

To keep the scope focused, the feature should not include:

- automated health diagnosis
- image-based plant monitoring
- advanced machine learning insights
- weather-based watering predictions

These capabilities could be considered future extensions.

---

# Expected Outcome

The application gains a **care history and insights feature** that helps users understand their plant care patterns.

Users can review past events, see when plants were last watered, and observe patterns in their watering habits.

This provides useful feedback that complements the existing daily watering workflow.

## ADLC

Build this task using the `_adlc` skill.
