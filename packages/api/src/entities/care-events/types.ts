export interface CareEvent {
    id: string;
    plantId: string;
    userId: string;
    action: "watered";
    performedDate: Date;
}
