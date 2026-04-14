import type { Household, HouseholdMember } from "../../entities/household/types.ts";

const SEED_DATE = new Date(2025, 0, 15, 0, 0, 0, 0);

export const defaultSeedHousehold: Household = {
    id: "household-1",
    name: "Green Thumbs",
    createdByUserId: "user-alice",
    creationDate: SEED_DATE
};

export const defaultSeedMembers: HouseholdMember[] = [
    {
        householdId: "household-1",
        userId: "user-alice",
        userName: "Alice",
        role: "owner",
        joinedDate: SEED_DATE
    },
    {
        householdId: "household-1",
        userId: "user-bob",
        userName: "Bob",
        role: "member",
        joinedDate: new Date(2025, 1, 1, 0, 0, 0, 0)
    }
];
