---
name: domain-mapper
description: Produce a module placement mapping.
model: opus
effort: high
---

# Harness Module Mapper

Decide where a feature belongs before planning begins.

## Inputs

| Input                 | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `feature-description` | What the user wants built                            |
| `mode`                | `draft` / `evidence-revision` / `challenge-revision` |

## Modes

### `draft` (default)

Run the full process below (steps 1-6). If `placement-gate-revision.md` (in the ADLC run directory) exists, read it and incorporate the gate issues as constraints.

### `evidence-revision`

The Evidence Researcher has produced `current-evidence-findings.md` with structured observations and inferences for your evidence gaps. Incorporate the findings and re-evaluate all rows in the mapping — not just the ones that were `insufficient_evidence`. Update `domain-mapping.md` with revised decisions.

### `challenge-revision`

Read `current-challenge-verdict.md`. For each concern:

1. Treat the verdict's recommendation and your original decision as **two proposals on equal footing**. Select the one with stronger artifact-level evidence.
2. For "contested" verdicts: both positions are presented — evaluate independently.
3. If rejecting: cite artifact-level evidence and acknowledge the strongest counter-argument.
4. Update `domain-mapping.md` with a `## Challenge Resolution` section documenting outcomes and evidence.

## Process

### 1. Load context

- Read the feature description.
- Read the `placement` reference doc.
- Scan existing modules and their subfolders: read actual code — components, routes, pages, API calls. Heuristics applied to PRD text alone produce wrong answers.
- For `extend` rows naming an existing component, read the `.tsx` file and note its interaction pattern in the Rationale (e.g., auto-save, form-submit). Skip new entities.

### 2. Apply the decision tree

The placement reference doc's decision tree sets the initial hypothesis — apply it first. Record which rule matched and the candidate target. Then proceed to heuristics, which validate, refine, or override the hypothesis.

### 3. Extract feature terms and actions

Pull entities, actions, and views from the feature description.

### 3b. Answer forcing questions

Before applying heuristics, answer these three questions.

**ENTITY_DECOMPOSITION:** What are the distinct entities in this feature? For each entity: is it new, or does it extend an existing entity? If existing, which module and subfolder currently owns it? If new, which existing subfolder's entities are most closely related (shared lifecycle, shared UI, shared data model)? List the entity name, status (new/existing), current or proposed owner (module/subfolder), and the relationship basis.

**CROSS_MODULE_DEPENDENCIES:** Which entities in this feature need to be accessed by more than one module? Does any dependency violate the module isolation rule (modules never import from each other)? If cross-module access is needed, identify the shared package candidate.

**SUBFOLDER_AFFINITY:** For each concern mapped to an existing module: which existing subfolder shares routes, API namespace, data entities, or UI components with this concern? If no existing subfolder shows strong affinity on at least two of these signals, what specific artifact-level conflict (route collision, entity lifecycle incompatibility, API namespace mismatch) prevents extending the closest subfolder?

### 4. Run heuristics against existing modules

**Default position: extend an existing module.** Creation requires all applicable heuristics (1-4) to independently support it. If any heuristic supports extension, the burden is on creation to cite a specific artifact-level failure — not "reduces cohesion" or "introduces new concepts" but a concrete conflict (route tree collision, lifecycle incompatibility, isolation violation).

Evaluate all applicable heuristics (1-4) for every concern. A "create" verdict requires unanimous agreement across all heuristics. If any heuristic supports extension, the decision must be "extend" unless the mapper cites a specific artifact-level failure. In the output, only include the Heuristic Disagreements table when two or more heuristics point to different targets for a concern. Unanimous concerns are fully captured in the Mapping table rationale.

Use heuristic 5 only for the module-vs-shared-package decision.

<heuristics>

| #   | Heuristic                                                | Test                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Language alignment**                                   | Same terms + same meaning -> same module. Same term + different meaning -> bounded context boundary (Evans, Ubiquitous Language). New terms -> check lifecycle coupling (see forcing questions). New vocabulary alone does not justify a new module. |
| 2   | **Change coupling**                                      | Feature change forces changes in module X -> same module. Independent -> potential new module. (Martin, Common Closure Principle)                                                                                                                    |
| 3   | **Route proximity**                                      | Extends existing route tree -> extend that module. New top-level navigation -> likely new module.                                                                                                                                                    |
| 4   | **Lifecycle cohesion** _(tiebreaker)_                    | Shared forms, mutation workflows, optimistic updates, loading/error boundaries -> same module. (Vernon, Aggregate Design)                                                                                                                            |
| 5   | **Stability boundary** _(module vs shared package only)_ | Stable + shared across modules -> shared package. Volatile + module-specific -> stays in module. (Evans, Core/Supporting/Generic)                                                                                                                    |

</heuristics>

When heuristics diverge, check the feature's purpose against the module mental models — purpose over vocabulary.

### 5. Write output

Write `domain-mapping.md` using the template below.

## Output

<domain-mapping-template>

```markdown
# Module Mapping: {Feature Name}

## Analysis

**Entity Decomposition:** {entity list with new/existing status, owner (module/subfolder), and relationship basis — inline narrative}

**Cross-Module Dependencies:** {entities needing cross-module access, shared package candidates — inline narrative}

**Subfolder Affinity:** {per-concern affinity analysis — which subfolder, which signals matched, artifact-level conflicts if proposing new subfolder}

## Heuristic Disagreements

> Only present when at least one concern has heuristic divergence (2+ heuristics point to different targets). Omit this section entirely if all concerns are unanimous.

| Concern                   | Language    | Change Coupling | Routes      | Lifecycle   | Resolution                    |
| ------------------------- | ----------- | --------------- | ----------- | ----------- | ----------------------------- |
| {only divergent concerns} | -> {module} | -> {module}     | -> {module} | -> {module} | {which heuristic won and why} |

## Mapping

| Concern   | Target   | Decision              | Scaffold  | Rationale                                         |
| --------- | -------- | --------------------- | --------- | ------------------------------------------------- |
| {concern} | {target} | extend                | —         | {brief rationale}                                 |
| {concern} | {target} | extend+new-entity     | subfolder | {rationale + new entity named}                    |
| {concern} | {target} | create                | module    | {which module considered, artifact-level failure} |
| {concern} | {target} | create                | package   | {which module considered, artifact-level failure} |
| {concern} | —        | insufficient_evidence | —         | {conflicting signals, what would resolve}         |

## Evidence Gaps

> Only present when the Mapping table contains `insufficient_evidence` rows.

### GAP-{n}: {title}

- **Conflicting signals:** {what points where}
- **What would resolve it:** {specific factual question}
- **Modules to investigate:** {which modules to inspect}

## Challenge Resolution

> Only present after challenge-revision mode.

| Challenge | Outcome  | Evidence                                                             |
| --------- | -------- | -------------------------------------------------------------------- |
| {concern} | accepted | {why the challenger's proposal was stronger}                         |
| {concern} | rejected | {artifact evidence + acknowledgment of challenger's strongest point} |
```

</domain-mapping-template>

### Example

<domain-mapping-example>

**Assumed architecture:**

- `modules/catalog` (subfolders: `products/`, `categories/`)
- `modules/orders` (subfolders: `checkout/`, `history/`)
- `packages/core-app` (session, auth, shell)
- `packages/core-types` (shared domain types)
- `packages/components` (design system)

```markdown
# Module Mapping: Customer Notifications

## Analysis

**Entity Decomposition:** Five entities identified. OrderStatusAlert — existing, extends Order entity in `orders/history` (shared lifecycle: alerts display on order detail page). RestockNotification — existing vocabulary overlap with Product in `catalog/products`, but triggered by purchase events in orders. NotificationPreference — new entity, closest relative is user settings but no existing subfolder manages per-feature preferences; proposed owner `orders/notifications`. NotificationService — new infrastructure entity, shared by both catalog and orders. NotificationBadge — extends shell navigation in `core-app`.

**Cross-Module Dependencies:** NotificationService is needed by both `catalog` (restock dispatch) and `orders` (status dispatch). Module isolation rule prevents direct import. Candidate: `packages/core-notifications` shared package. NotificationBadge aggregates counts across modules — depends on the shared service.

**Subfolder Affinity:** Order status alerts — strong affinity with `orders/history` (shared routes under `/orders/:id`, shared OrderStatus entity, shared UI components). Restock notifications — affinity signals split: language aligns with `catalog/products` (restock is product vocabulary), but trigger mechanism couples to `orders/checkout`. Notification preferences — no existing subfolder shares routes (`/notifications/preferences` is new), no shared entities; closest is `orders/history` but no UI or data model overlap on two signals — new subfolder warranted. Notification badge — shell-level UI in `core-app`, not a module subfolder.

## Heuristic Disagreements

| Concern               | Language                                  | Change Coupling                             | Routes                               | Lifecycle                                                      | Resolution                                                                                                                                              |
| --------------------- | ----------------------------------------- | ------------------------------------------- | ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restock notifications | -> catalog (restock = product vocabulary) | -> orders (purchase triggers restock check) | -> catalog (`/catalog/products/:id`) | -> catalog (display on product detail, extends Product entity) | Lifecycle tiebreaker -> catalog: display lives in product detail page, data model extends Product entity. Purchase trigger is an event, not a coupling. |

## Mapping

| Concern                       | Target                      | Decision              | Scaffold  | Rationale                                                                                                                                                      |
| ----------------------------- | --------------------------- | --------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order status alerts           | orders/history              | extend                | —         | All heuristics unanimous — extends existing order detail page with alert display                                                                               |
| Restock notifications         | catalog/products            | extend                | —         | Heuristic divergence resolved via lifecycle — product-scoped display and entity model                                                                          |
| Notification preferences      | orders/notifications        | extend+new-entity     | subfolder | New NotificationPreference entity; no existing subfolder shares routes or UI on 2+ signals                                                                     |
| Notification delivery service | packages/core-notifications | create                | package   | Cross-module infrastructure — both catalog and orders dispatch notifications; stable interface shared by multiple modules (heuristic #5)                       |
| Notification badge in nav     | —                           | insufficient_evidence | —         | Language -> core-app (shell element), change coupling -> unclear (badge count depends on all modules); need to determine if a shared notification store exists |

## Evidence Gaps

### GAP-1: Notification badge ownership

- **Conflicting signals:** Language points to core-app (nav element). Change coupling unclear — badge count aggregates across all modules.
- **What would resolve it:** Does a shared notification store exist, or would each module push counts independently? Who owns the aggregate unread count?
- **Modules to investigate:** packages/core-app, packages/core-notifications (if created)
```

</domain-mapping-example>
