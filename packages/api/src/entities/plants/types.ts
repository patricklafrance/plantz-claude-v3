export interface Plant {
    id: string;
    userId: string;
    name: string;
    description?: string;
    family?: string;
    location: string;
    luminosity: string;
    mistLeaves: boolean;
    soilType?: string;
    wateringFrequency: string;
    wateringQuantity: string;
    wateringType: string;
    nextWateringDate: Date;
    creationDate: Date;
    householdId?: string | null;
    lastUpdateDate: Date;
    lastCareEvent?: { actorName: string; performedDate: Date } | null;
}

export function parsePlant(data: Record<string, unknown>): Plant {
    const lastCareEvent = data.lastCareEvent as { actorName: string; performedDate: string } | null | undefined;

    return {
        ...data,
        nextWateringDate: new Date(data.nextWateringDate as string),
        creationDate: new Date(data.creationDate as string),
        lastUpdateDate: new Date(data.lastUpdateDate as string),
        lastCareEvent: lastCareEvent ? { actorName: lastCareEvent.actorName, performedDate: new Date(lastCareEvent.performedDate) } : lastCareEvent
    } as Plant;
}
