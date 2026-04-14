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
    plantsDb.reset(defaultSeedPlants);
    householdDb.reset([defaultSeedHousehold]);
    householdMembersDb.reset(defaultSeedMembers);
    invitationDb.reset(defaultSeedInvitations);
}
