import type { Plant } from "@packages/api/entities/plants";

import type { PlantFilters } from "./usePlantFilters.ts";

export function getOptionLabel(options: readonly { id: string; label: string }[], id: string): string {
    return options.find(o => o.id === id)?.label ?? id;
}

export function isDueForWatering(plant: Plant, now?: Date): boolean {
    const today = now ? new Date(now) : new Date();
    today.setHours(0, 0, 0, 0);
    const next = new Date(plant.nextWateringDate);
    next.setHours(0, 0, 0, 0);
    return next <= today;
}

export function applyPlantFilters(plants: Plant[], filters: PlantFilters, currentUserId?: string): Plant[] {
    let result = plants;

    if (filters.name) {
        const needle = filters.name.toLowerCase();
        result = result.filter(p => p.name.toLowerCase().includes(needle));
    }
    if (filters.location) {
        result = result.filter(p => p.location === filters.location);
    }
    if (filters.luminosity) {
        result = result.filter(p => p.luminosity === filters.luminosity);
    }
    if (filters.mistLeaves !== null) {
        result = result.filter(p => p.mistLeaves === filters.mistLeaves);
    }
    if (filters.wateringFrequency) {
        result = result.filter(p => p.wateringFrequency === filters.wateringFrequency);
    }
    if (filters.wateringType) {
        result = result.filter(p => p.wateringType === filters.wateringType);
    }
    if (filters.dueForWatering) {
        result = result.filter(p => isDueForWatering(p));
    }
    if (filters.soilType) {
        const needle = filters.soilType.toLowerCase();
        result = result.filter(p => p.soilType?.toLowerCase().includes(needle));
    }
    if (filters.assignment !== "all" && currentUserId) {
        switch (filters.assignment) {
            case "mine":
                // Plants assigned to current user OR personal plants (no householdId) OR unassigned shared plants
                result = result.filter(p => !p.householdId || p.assignedUserId === currentUserId || !p.assignedUserId);
                break;
            case "others":
                // Plants assigned to other household members (not current user, and has an assignment)
                result = result.filter(p => p.householdId && p.assignedUserId && p.assignedUserId !== currentUserId);
                break;
            case "unassigned":
                // Shared plants with no assignment
                result = result.filter(p => p.householdId && !p.assignedUserId);
                break;
        }
    }

    return result;
}
