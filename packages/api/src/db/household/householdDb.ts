import type { Household, HouseholdMember } from "../../entities/household/types.ts";

class HouseholdDb {
    #store = new Map<string, Household>();

    getAll(): Household[] {
        return [...this.#store.values()];
    }

    getByUser(userId: string): Household | undefined {
        return [...this.#store.values()].find(h => h.createdByUserId === userId);
    }

    getByMember(userId: string, membersDb: HouseholdMembersDb): Household | undefined {
        const membership = membersDb.getAll().find(m => m.userId === userId);

        if (!membership) {
            return undefined;
        }

        return this.#store.get(membership.householdId);
    }

    get(id: string): Household | undefined {
        return this.#store.get(id);
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

class HouseholdMembersDb {
    #store = new Map<string, HouseholdMember>();

    #key(householdId: string, userId: string): string {
        return `${householdId}:${userId}`;
    }

    getAll(): HouseholdMember[] {
        return [...this.#store.values()];
    }

    getByHousehold(householdId: string): HouseholdMember[] {
        return [...this.#store.values()].filter(m => m.householdId === householdId);
    }

    insert(member: HouseholdMember): HouseholdMember {
        this.#store.set(this.#key(member.householdId, member.userId), member);

        return member;
    }

    reset(members: HouseholdMember[]): void {
        this.#store.clear();

        for (const member of members) {
            this.#store.set(this.#key(member.householdId, member.userId), member);
        }
    }
}

export const householdDb = new HouseholdDb();
export const householdMembersDb = new HouseholdMembersDb();
