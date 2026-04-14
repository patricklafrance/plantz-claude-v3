import type { ResponsibilityAssignment } from "../../entities/household/types.ts";

class ResponsibilityAssignmentsDb {
    #store = new Map<string, ResponsibilityAssignment>();

    getAll(): ResponsibilityAssignment[] {
        return [...this.#store.values()];
    }

    getAllByHousehold(householdId: string): ResponsibilityAssignment[] {
        return [...this.#store.values()].filter(a => a.householdId === householdId);
    }

    getByPlant(plantId: string): ResponsibilityAssignment | undefined {
        return [...this.#store.values()].find(a => a.plantId === plantId);
    }

    get(id: string): ResponsibilityAssignment | undefined {
        return this.#store.get(id);
    }

    insert(assignment: ResponsibilityAssignment): ResponsibilityAssignment {
        this.#store.set(assignment.id, assignment);

        return assignment;
    }

    update(id: string, data: Partial<ResponsibilityAssignment>): ResponsibilityAssignment | undefined {
        const existing = this.#store.get(id);

        if (!existing) {
            return undefined;
        }

        const updated: ResponsibilityAssignment = { ...existing, ...data };
        this.#store.set(id, updated);

        return updated;
    }

    delete(id: string): boolean {
        return this.#store.delete(id);
    }

    reset(assignments: ResponsibilityAssignment[]): void {
        this.#store.clear();

        for (const assignment of assignments) {
            this.#store.set(assignment.id, assignment);
        }
    }
}

export const responsibilityAssignmentsDb = new ResponsibilityAssignmentsDb();
