export interface Household {
    id: string;
    name: string;
    createdByUserId: string;
    creationDate: Date;
}

export interface HouseholdMember {
    householdId: string;
    userId: string;
    userName: string;
    role: "owner" | "member";
    joinedDate: Date;
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
