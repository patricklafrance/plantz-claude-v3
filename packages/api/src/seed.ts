import { careEventsDb } from "./db/care-events/careEventsDb.ts";
import { defaultSeedCareEvents } from "./db/care-events/seedData.ts";
import { householdMembersDb } from "./db/household/householdMembersDb.ts";
import { householdsDb } from "./db/household/householdsDb.ts";
import { invitationsDb } from "./db/household/invitationsDb.ts";
import { defaultSeedHouseholds, defaultSeedInvitations, defaultSeedMembers } from "./db/household/seedData.ts";
import { plantsDb } from "./db/plants/plantsDb.ts";
import { defaultSeedPlants } from "./db/plants/seedData.ts";

export function seedDatabase() {
    plantsDb.reset(defaultSeedPlants);
    householdsDb.reset(defaultSeedHouseholds);
    householdMembersDb.reset(defaultSeedMembers);
    invitationsDb.reset(defaultSeedInvitations);
    careEventsDb.reset(defaultSeedCareEvents);
}
