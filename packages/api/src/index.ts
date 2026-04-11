// Re-export top-level types and utilities for convenience.
// Prefer subpath imports (e.g., @packages/api/entities/plants) for targeted imports.
export { type Plant, parsePlant } from "./entities/plants/types.ts";
export { getFrequencyDays } from "./entities/plants/plantUtils.ts";
