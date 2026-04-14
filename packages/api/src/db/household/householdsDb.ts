import type { Household } from "../../entities/household/types.ts";

class HouseholdsDb {
    #store = new Map<string, Household>();

    getAll(): Household[] {
        return [...this.#store.values()];
    }

    getByUser(userId: string): Household | undefined {
        return [...this.#store.values()].find(h => h.createdBy === userId);
    }

    get(id: string): Household | undefined {
        return this.#store.get(id);
    }

    insert(household: Household): Household {
        this.#store.set(household.id, household);

        return household;
    }

    update(id: string, data: Partial<Household>): Household | undefined {
        const existing = this.#store.get(id);

        if (!existing) {
            return undefined;
        }

        const updated: Household = { ...existing, ...data };
        this.#store.set(id, updated);

        return updated;
    }

    delete(id: string): boolean {
        return this.#store.delete(id);
    }

    reset(households: Household[]): void {
        this.#store.clear();

        for (const household of households) {
            this.#store.set(household.id, household);
        }
    }
}

export const householdsDb = new HouseholdsDb();
