import { plantsDb } from "./db/plants/plantsDb.ts";
import { defaultSeedPlants } from "./db/plants/seedData.ts";

export function seedDatabase() {
    plantsDb.reset(defaultSeedPlants);
}
