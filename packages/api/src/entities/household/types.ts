export interface Household {
    id: string;
    name: string;
    createdBy: string;
    creationDate: Date;
}

export interface HouseholdMember {
    id: string;
    householdId: string;
    userId: string;
    role: "owner" | "member";
    joinedDate: Date;
}

export interface Invitation {
    id: string;
    householdId: string;
    email: string;
    status: "pending" | "accepted" | "declined";
    createdBy: string;
    creationDate: Date;
}

export function parseHousehold(data: Record<string, unknown>): Household {
    return {
        ...data,
        creationDate: new Date(data.creationDate as string)
    } as Household;
}

export function parseHouseholdMember(data: Record<string, unknown>): HouseholdMember {
    return {
        ...data,
        joinedDate: new Date(data.joinedDate as string)
    } as HouseholdMember;
}

export function parseInvitation(data: Record<string, unknown>): Invitation {
    return {
        ...data,
        creationDate: new Date(data.creationDate as string)
    } as Invitation;
}
