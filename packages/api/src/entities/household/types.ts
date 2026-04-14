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
    userName?: string;
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

export interface ResponsibilityAssignment {
    id: string;
    plantId: string;
    householdId: string;
    assignedUserId: string | null;
    assignedUserName: string | null;
}

export function parseResponsibilityAssignment(data: Record<string, unknown>): ResponsibilityAssignment {
    return {
        id: data.id,
        plantId: data.plantId,
        householdId: data.householdId,
        assignedUserId: data.assignedUserId ?? null,
        assignedUserName: data.assignedUserName ?? null
    } as ResponsibilityAssignment;
}
