# Module Mapping: Plant Tracker

## Analysis

**Entity Decomposition:** Plant — existing core entity in `plants/plant-list`. WateringSchedule — existing, extends Plant lifecycle in `plants/watering`. HealthLog — new entity, closest relative is Plant in `plants/plant-list` (shared data model), but observation-oriented lifecycle differs from CRUD. PlantImage — cross-module infrastructure, used by both plant list and health tracking.

**Cross-Module Dependencies:** PlantImage needed by multiple subfolders within plants and potentially other modules. Candidate: `@packages/core-media` shared package for image handling.

**Subfolder Affinity:** Plant CRUD — strong affinity with `plants/plant-list` (shared routes, shared Plant entity, shared UI components). Watering actions — strong affinity with `plants/watering` (shared routes under `/plants/:id/watering`, shared mutation workflows). Health tracking — no existing subfolder shares routes or UI on 2+ signals; proposed `plants/health` subfolder.

## Mapping

| Concern          | Target               | Decision          | Scaffold  | Rationale                                                      |
| ---------------- | -------------------- | ----------------- | --------- | -------------------------------------------------------------- |
| Plant CRUD       | plants/plant-list    | extend            | —         | Language + routes — core entity management                     |
| Watering actions | plants/watering      | extend            | —         | Change coupling — watering mutations are independent of CRUD   |
| Health tracking  | plants/health        | extend+new-entity | subfolder | Lifecycle cohesion — observation data has its own update cycle |
| Plant images     | @packages/core-media | create            | package   | Stability boundary — shared image handling across modules      |
