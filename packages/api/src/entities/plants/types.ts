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
    householdId?: string;
    isShared: boolean;
    wateringFrequency: string;
    wateringQuantity: string;
    wateringType: string;
    nextWateringDate: Date;
    creationDate: Date;
    lastUpdateDate: Date;
}

export function parsePlant(data: Record<string, unknown>): Plant {
    return {
        ...data,
        isShared: Boolean(data.isShared ?? false),
        nextWateringDate: new Date(data.nextWateringDate as string),
        creationDate: new Date(data.creationDate as string),
        lastUpdateDate: new Date(data.lastUpdateDate as string)
    } as Plant;
}
