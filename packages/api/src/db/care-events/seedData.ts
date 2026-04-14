import type { CareEvent } from "../../entities/care-events/types.ts";

function hoursAgo(hours: number): Date {
    const date = new Date();
    date.setTime(date.getTime() - hours * 60 * 60 * 1000);

    return date;
}

// Seed care events referencing plants from defaultSeedPlants.
// These use stable IDs so stories and tests can cross-reference them.
export const defaultSeedCareEvents: CareEvent[] = [
    {
        id: "care-event-1",
        plantId: "seed-plant-1",
        actorId: "user-bob",
        actorName: "Bob",
        eventType: "watered",
        timestamp: hoursAgo(2)
    },
    {
        id: "care-event-2",
        plantId: "seed-plant-2",
        actorId: "user-alice",
        actorName: "Alice",
        eventType: "watered",
        timestamp: hoursAgo(5)
    },
    {
        id: "care-event-3",
        plantId: "seed-plant-3",
        actorId: "user-bob",
        actorName: "Bob",
        eventType: "watered",
        timestamp: hoursAgo(24)
    }
];
