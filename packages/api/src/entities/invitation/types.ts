export interface Invitation {
    id: string;
    householdId: string;
    inviteeEmail: string;
    status: "pending" | "accepted" | "declined";
    createdByUserId: string;
    createdAt: Date;
}

export function parseInvitation(data: Record<string, unknown>): Invitation {
    return {
        ...data,
        createdAt: new Date(data.createdAt as string)
    } as Invitation;
}
