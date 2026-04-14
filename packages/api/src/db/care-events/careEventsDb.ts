import type { CareEvent } from "../../entities/care-events/types.ts";

class CareEventsDb {
    #store = new Map<string, CareEvent>();

    getAll(): CareEvent[] {
        return [...this.#store.values()].toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    getAllByPlant(plantId: string): CareEvent[] {
        return [...this.#store.values()].filter(e => e.plantId === plantId).toSorted((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    get(id: string): CareEvent | undefined {
        return this.#store.get(id);
    }

    insert(event: CareEvent): CareEvent {
        this.#store.set(event.id, event);

        return event;
    }

    delete(id: string): boolean {
        return this.#store.delete(id);
    }

    reset(events: CareEvent[]): void {
        this.#store.clear();

        for (const event of events) {
            this.#store.set(event.id, event);
        }
    }
}

export const careEventsDb = new CareEventsDb();
