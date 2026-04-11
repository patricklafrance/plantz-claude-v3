# Add Multi-User Household and Shared Care Coordination Feature

## Goal

Add a **Multi-User Household and Shared Care Coordination** feature that allows multiple users to collaborate on plant care within a shared space.

The feature should enable users to:

- share plants with other people
- coordinate watering responsibilities
- track who performed care actions
- avoid duplicated or missed watering

The goal is to support real-world scenarios where plant care is **shared across roommates, couples, or families**, while keeping coordination simple and visible.

---

# Context

The application currently assumes a **single user managing all plants**.

In many real situations:

- multiple people care for the same plants
- responsibilities are informal and inconsistent
- users may not know if someone else already watered a plant
- tasks may be forgotten or duplicated

This feature introduces a **shared ownership model** and a **coordination layer** on top of plant care.

---

# User Workflows

## Create or Join a Household

A user can:

1. Create a household
2. Invite other users
3. Join a household via invitation

Once part of a household, users can access shared plants and tasks.

---

## Share Plants

A user can:

- toggle sharing on or off for a plant from the existing plant edit dialog
- view which plants are shared

Toggling sharing must follow the existing auto-save pattern used by the edit dialog (debounce + optimistic persistence). There is no separate submit button — the save indicator ("Saving…" / "Saved") should reflect the sharing change just like any other field edit.

Shared plants become visible to all members.

---

## Assign Responsibilities

Users can assign responsibility for plant care.

Possible patterns include:

- fixed owner per plant
- rotating responsibility
- unassigned (anyone can act)

Assignments help clarify who is expected to take action.

---

## Perform Care Actions

When a user waters a plant:

- the system records **who performed the action**
- the action is visible to other members
- the plant status updates for everyone

This prevents duplicate watering.

---

## View Shared Today Tasks

Each user sees a **Today view** adapted to shared responsibility.

The view may include:

- tasks assigned to the user
- tasks assigned to others
- unassigned tasks

Users can quickly understand what they are responsible for.

---

## Resolve Conflicts

If multiple users act at the same time or perform conflicting actions:

- the system should handle it gracefully
- the most recent action should be reflected
- users should be able to see what happened

---

# Domain Concepts

## Household

Represents a group of users sharing plant care.

A household includes:

- identifier
- list of members
- creation metadata

Users may belong to one or more households depending on scope.

---

## Household Member

Represents a user within a household.

A member may have attributes such as:

- role (optional)
- permissions (optional)

Initial implementation may treat all members equally.

---

## Shared Plant

A plant associated with a household.

Shared plants:

- are visible to all household members
- can be acted on by multiple users
- participate in shared coordination

---

## Responsibility Assignment

Represents who is expected to care for a plant.

Examples:

- assigned to a specific user
- assigned to any member
- assigned via rotation

---

## Care Event with Actor

Care events must include the user who performed the action.

This allows the system to track:

- who watered a plant
- when it was done
- how responsibilities are fulfilled

---

# Coordination Logic

The system should support coordination across users.

Key behaviors include:

## Prevent Duplicate Actions

If a plant is already watered:

- other users should see the updated status
- duplicate watering should be discouraged

---

## Visibility of Actions

All members should see:

- recent actions performed by others
- who completed a task
- when it was completed

---

## Responsibility Awareness

Users should understand:

- which tasks are theirs
- which tasks belong to others
- which tasks are unassigned

---

## Task Ownership Flexibility

Even if a task is assigned:

- another user may still complete it
- the system should not block actions

---

# Notification Concepts (Lightweight)

The system may provide lightweight awareness, such as:

- indication that a task was completed by another user
- indication that a plant was recently updated

This does not require a full notification system.

---

# User Interface Expectations

## Household Management

Users should be able to:

- create a household
- invite members
- view current members

---

## Shared Plant Indicators

Plants that are shared should be visually identifiable.

Users should see:

- that a plant is shared
- optionally, who is primarily responsible

---

## Today View (Shared Context)

The Today view should adapt to show:

- tasks assigned to the current user
- tasks assigned to others
- tasks available for anyone

Each task may display:

- plant name
- due status
- assigned user (if any)
- recent activity

---

## Activity Visibility

Users should see recent actions, such as:

- "Watered by Alex 2 hours ago"

This helps coordination and trust.

---

# Relationship With Existing Features

This feature extends existing plant and watering logic.

- plants can exist in personal or shared contexts
- watering actions now include an actor
- Today view becomes context-aware of shared responsibilities

Existing single-user flows should continue to work without requiring a household.

---

# Validation Rules

Basic validation should ensure:

- a household has at least one member
- invitations are valid
- shared plants belong to a valid household

When assigning responsibility:

- assigned user must be a household member

---

# Edge Cases

The system should handle situations such as:

- a user leaving a household
- removing a plant from a household
- multiple users watering at nearly the same time
- conflicting updates from different users
- no assigned responsibility
- all members inactive
- switching between personal and shared plants

---

# Non Goals

To keep the feature focused, the following are excluded:

- real-time synchronization across devices
- push notification systems
- complex permission models
- chat or messaging between users
- external integrations

These may be added in future iterations.

---

# Expected Outcome

The application evolves from a single-user tool into a **collaborative plant care system**.

Users can share responsibility, coordinate actions, and maintain visibility into who is caring for plants.

The feature reduces confusion, avoids duplicate work, and better reflects real-world shared environments.

This introduces significant complexity across domain modeling, workflows, and UI, making it a strong candidate for testing advanced agent orchestration.

## ADLC

Build this task using the `_adlc` skill.
