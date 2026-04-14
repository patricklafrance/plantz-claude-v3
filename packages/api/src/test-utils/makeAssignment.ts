import type { ResponsibilityAssignment } from "../entities/household/types.ts";

export function makeAssignment(overrides: Partial<ResponsibilityAssignment> & { id: string; plantId: string }): ResponsibilityAssignment {
    return {
        householdId: "household-1",
        assignedUserId: "user-alice",
        assignedUserName: "Alice",
        ...overrides
    };
}
