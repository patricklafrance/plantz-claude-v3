import { householdDb } from "./db/household/householdDb.ts";
import { plantsDb } from "./db/plants/plantsDb.ts";
import { defaultSeedPlants } from "./db/plants/seedData.ts";

export function seedDatabase() {
    plantsDb.reset(defaultSeedPlants);
    householdDb.reset([{ id: "household-1", name: "Green Thumbs", memberIds: ["user-alice"] }]);
}
