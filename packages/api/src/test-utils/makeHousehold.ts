import type { Household, HouseholdMember, Invitation } from "../entities/household/types.ts";

const FIXED_CREATION = new Date(2025, 0, 1, 0, 0, 0, 0);

export function makeHousehold(overrides: Partial<Household> & { id: string; name: string }): Household {
    return {
        createdBy: "user-alice",
        creationDate: FIXED_CREATION,
        ...overrides
    };
}

export function makeHouseholdMember(overrides: Partial<HouseholdMember> & { id: string; userId: string }): HouseholdMember {
    return {
        householdId: "household-1",
        role: "member",
        joinedDate: FIXED_CREATION,
        ...overrides
    };
}

export function makeInvitation(overrides: Partial<Invitation> & { id: string; email: string }): Invitation {
    return {
        householdId: "household-1",
        status: "pending",
        createdBy: "user-alice",
        creationDate: FIXED_CREATION,
        ...overrides
    };
}
