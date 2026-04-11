# Add Vacation Planner Feature

## Goal

Add a **Vacation Planner** feature that helps users prepare their plants for an upcoming trip.

The feature should analyze the watering schedule of each plant and produce a **clear plan of actions** to ensure plants are properly watered while the user is away.

The planner should help the user answer questions such as:

- Which plants must be watered before leaving?
- Which plants can safely wait until the user returns?
- Which plants will require someone else to water them?
- Are any plants already overdue?

The feature should integrate naturally with the current plant management and daily watering flows.

---

# Context

The application already tracks plants and their watering schedules.

Users regularly consult the **Today view** to determine which plants need watering.

The vacation planner introduces a temporary situation where the user will not be available to water plants during a specific time window.

The system must therefore analyze plant schedules relative to the user's trip.

---

# User Workflows

## Create a Vacation Plan

A user can:

1. Open the **Vacation Planner**.
2. Enter a **start date** and **end date** for their trip.
3. Generate a watering forecast.
4. Review recommendations for each plant.
5. Optionally modify some recommendations.
6. Save the vacation plan.

Once saved, the plan influences what the user sees in their daily view.

---

## Review Forecast

After generating a forecast, the user should see plants grouped by recommendation.

For each plant the interface should present:

- plant name
- next watering date
- recommended action
- explanation for the recommendation

The user may override the recommendation if desired.

---

## Delegate Watering

For plants that cannot safely wait until the user returns, the user may choose to **delegate watering**.

When delegation is chosen, the user can record:

- the name of the helper
- the date the plant should be watered
- optional notes

This information is for the user’s reference.

---

# Domain Concepts

## Vacation Plan

Represents a period during which the user will be away.

A vacation plan includes:

- an identifier
- start date
- end date
- planning strategy
- lifecycle status
- timestamps

Only one active vacation plan should exist at a time.

Plans may be edited before they become active.

---

## Plant Recommendation

Each plant included in the forecast receives a recommendation describing the best action during the trip.

The recommendation may include:

- recommendation type
- reasoning
- suggested action date
- optional user override
- optional delegation information

---

# Recommendation Types

Each plant must receive exactly one recommendation.

### Water Before Trip

The plant should be watered before the user leaves.

This typically happens when:

- the plant is due shortly before the trip
- the plant will become due soon after departure and watering slightly early is acceptable

---

### Safe Until Return

The plant will not need watering until after the user returns.

No action is required.

---

### Delegate Watering

The plant will need watering during the trip and cannot be watered early without risking harm.

Another person should water it.

---

### Already Overdue

The plant is already overdue before the trip begins.

This should be clearly surfaced to the user.

---

# Planning Strategy

Different planning strategies may influence recommendations.

Examples include:

Conservative
Prefer watering slightly early rather than risking dehydration.

Balanced
Follow the expected watering cadence with moderate flexibility.

Minimal Intervention
Avoid watering early unless absolutely necessary.

The strategy mainly affects how tolerant the system is of watering earlier than scheduled.

---

# Forecast Logic

The system should determine recommendations using information such as:

- last watering date
- watering interval
- expected next watering date
- vacation start date
- vacation end date

Using these inputs, the system evaluates whether watering should happen before the trip, during the trip, or after the user returns.

---

# Risk Indicators

Recommendations may include a qualitative risk indicator.

Possible interpretations include:

Low risk
The plant will not require watering until well after the trip.

Medium risk
The plant will become due close to the user’s return.

High risk
The plant requires watering during the trip or is already overdue.

---

# User Interface Expectations

## Vacation Planner Screen

The planner should allow the user to:

- enter trip dates
- choose a planning strategy
- generate a forecast

After generating the forecast, the page should display grouped recommendations.

Possible groupings include:

- plants needing watering before departure
- plants requiring delegation during the trip
- plants safe until return
- plants already overdue

Each plant entry should display the reasoning behind its recommendation.

---

## Today View Integration

The Today view should reflect the existence of an upcoming or active trip.

Possible behaviors include:

- highlighting tasks that should be completed before departure
- showing plants delegated during the trip
- showing follow-up watering tasks after the user returns

The goal is to help the user understand how the trip affects their plant care routine.

---

# Validation Rules

Basic validation should ensure:

- start date is provided
- end date occurs after start date
- trip duration is at least one day

If delegation information is entered, the helper name and watering date should be present.

---

# Edge Cases

The system should handle situations such as:

- the trip starts today
- the trip lasts only one day
- plants are already overdue when the plan is created
- multiple plants become due on the departure date
- plants with very short watering intervals
- editing an existing vacation plan
- cancelling a vacation plan
- attempting to create a new plan while another is active

---

# Non Goals

To keep the scope focused, the feature should not include:

- weather-based watering adjustments
- push notifications
- calendar integrations
- multi-user collaboration
- AI plant health analysis

---

# Expected Outcome

The application gains a feature that helps users prepare their plants for trips.

The vacation planner analyzes plant schedules, generates actionable recommendations, and allows the user to plan watering activities before, during, and after their trip.

The feature should fit naturally with existing plant management and daily watering workflows.

## ADLC

Build this task using the `_adlc` skill.
