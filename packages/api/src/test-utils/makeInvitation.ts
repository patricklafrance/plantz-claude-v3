import type { Invitation } from "../entities/invitation/types.ts";

const FIXED_DATE = new Date(2025, 0, 1, 0, 0, 0, 0);

export function makeInvitation(overrides: Partial<Invitation> & { id: string; householdId: string; inviteeEmail: string }): Invitation {
    return {
        status: "pending",
        createdByUserId: "user-alice",
        createdAt: FIXED_DATE,
        ...overrides
    };
}
