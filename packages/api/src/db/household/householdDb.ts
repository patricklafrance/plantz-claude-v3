import type { Household } from "../../entities/household/types.ts";

class HouseholdDb {
    #store = new Map<string, Household>();

    get(id: string): Household | undefined {
        return this.#store.get(id);
    }

    getByUserId(userId: string): Household | undefined {
        for (const household of this.#store.values()) {
            if (household.memberIds.includes(userId)) {
                return household;
            }
        }

        return undefined;
    }

    insert(household: Household): Household {
        this.#store.set(household.id, household);

        return household;
    }

    reset(households: Household[]): void {
        this.#store.clear();

        for (const household of households) {
            this.#store.set(household.id, household);
        }
    }
}

export const householdDb = new HouseholdDb();
