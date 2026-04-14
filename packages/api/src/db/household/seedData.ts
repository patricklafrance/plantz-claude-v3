import type { Household, HouseholdMember, Invitation } from "../../entities/household/types.ts";

const SEED_DATE = new Date(2025, 0, 15, 0, 0, 0, 0);

export const defaultSeedHouseholds: Household[] = [
    {
        id: "household-1",
        name: "Green Thumb Family",
        createdBy: "user-alice",
        creationDate: SEED_DATE
    }
];

export const defaultSeedMembers: HouseholdMember[] = [
    {
        id: "member-1",
        householdId: "household-1",
        userId: "user-alice",
        role: "owner",
        joinedDate: SEED_DATE
    },
    {
        id: "member-2",
        householdId: "household-1",
        userId: "user-bob",
        role: "member",
        joinedDate: new Date(2025, 0, 20, 0, 0, 0, 0)
    }
];

export const defaultSeedInvitations: Invitation[] = [
    {
        id: "invitation-1",
        householdId: "household-1",
        email: "charlie@example.com",
        status: "pending",
        createdBy: "user-alice",
        creationDate: new Date(2025, 1, 1, 0, 0, 0, 0)
    }
];
