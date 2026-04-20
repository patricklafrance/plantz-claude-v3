import type { Plant } from "../../entities/plants/types.ts";

class PlantsDb {
    #store = new Map<string, Plant>();

    getAll(): Plant[] {
        return [...this.#store.values()].toSorted((a, b) => a.name.localeCompare(b.name));
    }

    getAllByUser(userId: string): Plant[] {
        return [...this.#store.values()].filter(plant => plant.userId === userId).toSorted((a, b) => a.name.localeCompare(b.name));
    }

    getAllByHousehold(householdId: string): Plant[] {
        return [...this.#store.values()].filter(plant => plant.householdId === householdId).toSorted((a, b) => a.name.localeCompare(b.name));
    }

    get(id: string): Plant | undefined {
        return this.#store.get(id);
    }

    insert(plant: Plant): Plant {
        this.#store.set(plant.id, plant);

        return plant;
    }

    update(id: string, data: Partial<Plant>): Plant | undefined {
        const existing = this.#store.get(id);

        if (!existing) {
            return undefined;
        }

        const updated: Plant = { ...existing, ...data, lastUpdateDate: new Date() };
        this.#store.set(id, updated);

        return updated;
    }

    delete(id: string): boolean {
        return this.#store.delete(id);
    }

    deleteMany(ids: string[]): void {
        for (const id of ids) {
            this.#store.delete(id);
        }
    }

    reset(plants: Plant[]): void {
        this.#store.clear();

        for (const plant of plants) {
            this.#store.set(plant.id, plant);
        }
    }
}

export const plantsDb = new PlantsDb();
