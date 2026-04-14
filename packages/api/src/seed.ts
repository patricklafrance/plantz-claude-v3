import { careEventsDb } from "./db/care-events/careEventsDb.ts";
import { plantsDb } from "./db/plants/plantsDb.ts";
import { defaultSeedPlants } from "./db/plants/seedData.ts";

export function seedDatabase() {
    careEventsDb.reset();
    plantsDb.reset(defaultSeedPlants);

    // Seed sample care events for the first two plants
    const firstPlant = defaultSeedPlants[0];
    const secondPlant = defaultSeedPlants[1];

    if (firstPlant) {
        careEventsDb.insert({
            id: "care-event-seed-1",
            plantId: firstPlant.id,
            userId: "user-alice",
            action: "watered",
            performedDate: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
        });
        careEventsDb.insert({
            id: "care-event-seed-2",
            plantId: firstPlant.id,
            userId: "user-bob",
            action: "watered",
            performedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        });
    }

    if (secondPlant) {
        careEventsDb.insert({
            id: "care-event-seed-3",
            plantId: secondPlant.id,
            userId: "user-bob",
            action: "watered",
            performedDate: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
        });
    }
}
