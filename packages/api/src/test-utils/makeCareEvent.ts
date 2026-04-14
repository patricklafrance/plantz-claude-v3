import type { CareEvent } from "../entities/care-events/types.ts";

const FIXED_TIMESTAMP = new Date(2025, 2, 15, 10, 0, 0, 0);

export function makeCareEvent(overrides: Partial<CareEvent> & { id: string; plantId: string; actorId: string; actorName: string }): CareEvent {
    return {
        eventType: "watered",
        timestamp: FIXED_TIMESTAMP,
        ...overrides
    };
}
