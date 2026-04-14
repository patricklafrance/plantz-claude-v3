import { careEventsDb } from "./db/care-events/careEventsDb.ts";
import { householdDb, householdMembersDb } from "./db/household/householdDb.ts";
import { defaultSeedHousehold, defaultSeedMembers } from "./db/household/seedData.ts";
import { invitationDb } from "./db/invitation/invitationDb.ts";
import { plantsDb } from "./db/plants/plantsDb.ts";
import { defaultSeedPlants } from "./db/plants/seedData.ts";
import type { Invitation } from "./entities/invitation/types.ts";

const defaultSeedInvitations: Invitation[] = [
    {
        id: "invitation-1",
        householdId: "household-1",
        inviteeEmail: "charlie@example.com",
        status: "pending",
        createdByUserId: "user-alice",
        createdAt: new Date(2025, 2, 1, 0, 0, 0, 0)
    }
];

export function seedDatabase() {
    careEventsDb.reset();
    plantsDb.reset(defaultSeedPlants);
    householdDb.reset([defaultSeedHousehold]);
    householdMembersDb.reset(defaultSeedMembers);
    invitationDb.reset(defaultSeedInvitations);

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
