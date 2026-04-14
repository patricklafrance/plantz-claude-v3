export interface CareEvent {
    id: string;
    plantId: string;
    actorId: string;
    actorName: string;
    eventType: "watered";
    timestamp: Date;
}

export function parseCareEvent(data: Record<string, unknown>): CareEvent {
    return {
        ...data,
        timestamp: new Date(data.timestamp as string)
    } as CareEvent;
}
