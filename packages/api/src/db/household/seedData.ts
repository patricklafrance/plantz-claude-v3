import type { Household, HouseholdMember, Invitation, ResponsibilityAssignment } from "../../entities/household/types.ts";

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

// Assignments are generated dynamically in seed.ts because plant IDs are random.
// This helper creates assignments for the first N shared plants.
export function generateSeedAssignments(sharedPlantIds: string[]): ResponsibilityAssignment[] {
    const assignments: ResponsibilityAssignment[] = [];

    // Assign first 5 shared plants to Alice
    for (let i = 0; i < Math.min(5, sharedPlantIds.length); i++) {
        assignments.push({
            id: `assignment-${i + 1}`,
            plantId: sharedPlantIds[i]!,
            householdId: "household-1",
            assignedUserId: "user-alice",
            assignedUserName: "Alice"
        });
    }

    // Assign next 5 shared plants to Bob
    for (let i = 5; i < Math.min(10, sharedPlantIds.length); i++) {
        assignments.push({
            id: `assignment-${i + 1}`,
            plantId: sharedPlantIds[i]!,
            householdId: "household-1",
            assignedUserId: "user-bob",
            assignedUserName: "Bob"
        });
    }

    // Leave remaining shared plants unassigned (no assignment record)

    return assignments;
}
