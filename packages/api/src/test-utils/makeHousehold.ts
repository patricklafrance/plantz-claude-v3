import type { Household, HouseholdMember } from "../entities/household/types.ts";

const FIXED_DATE = new Date(2025, 0, 1, 0, 0, 0, 0);

export function makeHousehold(overrides: Partial<Household> & { id: string; name: string }): Household {
    return {
        createdByUserId: "user-alice",
        creationDate: FIXED_DATE,
        ...overrides
    };
}

export function makeHouseholdMember(
    overrides: Partial<HouseholdMember> & { householdId: string; userId: string; userName: string }
): HouseholdMember {
    return {
        role: "member",
        joinedDate: FIXED_DATE,
        ...overrides
    };
}
