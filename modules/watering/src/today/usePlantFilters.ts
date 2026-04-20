import { useState, useCallback } from "react";

export type AssignmentFilter = "all" | "mine" | "others" | "unassigned";

export interface PlantFilters {
    name: string;
    location: string | null;
    luminosity: string | null;
    mistLeaves: boolean | null;
    soilType: string;
    wateringFrequency: string | null;
    wateringType: string | null;
    dueForWatering: boolean;
    assignment: AssignmentFilter;
}

const defaultFilters: PlantFilters = {
    name: "",
    location: null,
    luminosity: null,
    mistLeaves: null,
    soilType: "",
    wateringFrequency: null,
    wateringType: null,
    dueForWatering: false,
    assignment: "all"
};

export function usePlantFilters() {
    const [filters, setFilters] = useState<PlantFilters>(defaultFilters);

    const updateFilter = useCallback(<K extends keyof PlantFilters>(key: K, value: PlantFilters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(defaultFilters);
    }, []);

    const hasActiveFilters =
        filters.name !== "" ||
        filters.location !== null ||
        filters.luminosity !== null ||
        filters.mistLeaves !== null ||
        filters.soilType !== "" ||
        filters.wateringFrequency !== null ||
        filters.wateringType !== null ||
        filters.dueForWatering ||
        filters.assignment !== "all";

    return { filters, updateFilter, clearFilters, hasActiveFilters };
}
