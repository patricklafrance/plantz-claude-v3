import type { CareEvent } from "../../entities/care-events/types.ts";

class CareEventsDb {
    #store = new Map<string, CareEvent>();

    insert(event: CareEvent): CareEvent {
        this.#store.set(event.id, event);

        return event;
    }

    getByPlant(plantId: string): CareEvent[] {
        return [...this.#store.values()].filter(e => e.plantId === plantId).toSorted((a, b) => b.performedDate.getTime() - a.performedDate.getTime());
    }

    getLastByPlant(plantId: string): CareEvent | undefined {
        return this.getByPlant(plantId)[0];
    }

    reset(): void {
        this.#store.clear();
    }
}

export const careEventsDb = new CareEventsDb();
