import type { Plant } from "../entities/plants/types.ts";

// Extreme dates ensure isDueForWatering() returns a deterministic result
// regardless of when the snapshot runs — no Date freeze needed.
export const FAR_FUTURE = new Date(2099, 0, 1, 0, 0, 0, 0);
export const FAR_PAST = new Date(2020, 0, 1, 0, 0, 0, 0);
const FIXED_CREATION = new Date(2025, 0, 1, 0, 0, 0, 0);

export function makePlant(overrides: Partial<Plant> & { id: string; name: string }): Plant {
    return {
        userId: "user-alice",
        description: undefined,
        family: undefined,
        location: "living-room",
        luminosity: "medium",
        mistLeaves: true,
        soilType: undefined,
        isShared: false,
        wateringFrequency: "1-week",
        wateringQuantity: "200ml",
        wateringType: "surface",
        nextWateringDate: FAR_FUTURE,
        creationDate: FIXED_CREATION,
        lastUpdateDate: FIXED_CREATION,
        ...overrides
    };
}
