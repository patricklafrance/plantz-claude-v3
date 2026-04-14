import type { HouseholdMember } from "../../entities/household/types.ts";

class HouseholdMembersDb {
    #store = new Map<string, HouseholdMember>();

    getAll(): HouseholdMember[] {
        return [...this.#store.values()];
    }

    getAllByHousehold(householdId: string): HouseholdMember[] {
        return [...this.#store.values()].filter(m => m.householdId === householdId);
    }

    getAllByUser(userId: string): HouseholdMember[] {
        return [...this.#store.values()].filter(m => m.userId === userId);
    }

    get(id: string): HouseholdMember | undefined {
        return this.#store.get(id);
    }

    insert(member: HouseholdMember): HouseholdMember {
        this.#store.set(member.id, member);

        return member;
    }

    update(id: string, data: Partial<HouseholdMember>): HouseholdMember | undefined {
        const existing = this.#store.get(id);

        if (!existing) {
            return undefined;
        }

        const updated: HouseholdMember = { ...existing, ...data };
        this.#store.set(id, updated);

        return updated;
    }

    delete(id: string): boolean {
        return this.#store.delete(id);
    }

    reset(members: HouseholdMember[]): void {
        this.#store.clear();

        for (const member of members) {
            this.#store.set(member.id, member);
        }
    }
}

export const householdMembersDb = new HouseholdMembersDb();
