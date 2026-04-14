import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type CareEvent, parseCareEvent } from "@packages/api/entities/care-events";
import {
    type Household,
    type HouseholdMember,
    type ResponsibilityAssignment,
    parseHousehold,
    parseHouseholdMember,
    parseResponsibilityAssignment
} from "@packages/api/entities/household";
import { type Plant, parsePlant } from "@packages/api/entities/plants";
import { useSession } from "@packages/core-module";

const API_BASE = "/api/today/plants";
const QUERY_KEY = ["today", "plants", "list"];
const CARE_EVENTS_KEY = ["today", "care-events"];
const HOUSEHOLD_KEY = ["management", "household"];
const MEMBERS_KEY = ["management", "household", "members"];

export interface PlantWithAssignment extends Plant {
    assignment: ResponsibilityAssignment | null;
}

export function useTodayPlants() {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const response = await fetch(API_BASE);

            if (!response.ok) {
                throw new Error(`Failed to fetch plants: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => {
                const record = item as Record<string, unknown>;
                const plant = parsePlant(record);
                const assignment = record.assignment ? parseResponsibilityAssignment(record.assignment as Record<string, unknown>) : null;

                return Object.assign({}, plant, { assignment }) as PlantWithAssignment;
            });
        }
    });
}

export function useHousehold() {
    return useQuery<Household | null>({
        queryKey: HOUSEHOLD_KEY,
        queryFn: async () => {
            const response = await fetch("/api/management/household");

            if (!response.ok) {
                throw new Error(`Failed to fetch household: ${response.status}`);
            }

            const data = await response.json();

            if (!data) {
                return null;
            }

            return parseHousehold(data as Record<string, unknown>);
        }
    });
}

export function useHouseholdMembers(householdId: string | undefined) {
    return useQuery<HouseholdMember[]>({
        queryKey: [...MEMBERS_KEY, householdId],
        queryFn: async () => {
            const response = await fetch(`/api/management/household/${householdId}/members`);

            if (!response.ok) {
                throw new Error(`Failed to fetch members: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => parseHouseholdMember(item as Record<string, unknown>));
        },
        enabled: !!householdId
    });
}

export function useCreateAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { plantId: string; householdId: string; assignedUserId: string; assignedUserName: string }) => {
            const response = await fetch("/api/today/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Failed to create assignment: ${response.status}`);
            }

            return parseResponsibilityAssignment(await response.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
    });
}

export function useUpdateAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string; assignedUserId: string | null; assignedUserName: string | null }) => {
            const response = await fetch(`/api/today/assignments/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Failed to update assignment: ${response.status}`);
            }

            return parseResponsibilityAssignment(await response.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
    });
}

export function useDeleteAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/today/assignments/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error(`Failed to delete assignment: ${response.status}`);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
    });
}

export function useMarkWatered() {
    const queryClient = useQueryClient();
    const session = useSession();

    return useMutation({
        mutationFn: async ({ id, nextWateringDate }: { id: string; nextWateringDate: Date }) => {
            const response = await fetch(`${API_BASE}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nextWateringDate })
            });

            if (!response.ok) {
                throw new Error(`Failed to mark plant ${id} as watered: ${response.status}`);
            }

            // Fire care event best-effort — don't await so it doesn't block the watering mutation
            if (session) {
                fetch("/api/today/care-events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        plantId: id,
                        actorId: session.id,
                        actorName: session.name,
                        eventType: "watered",
                        timestamp: new Date().toISOString()
                    })
                }).catch(() => {});
            }

            return parsePlant(await response.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: CARE_EVENTS_KEY });
        }
    });
}

export function useCareEvents(plantId: string | undefined) {
    return useQuery({
        queryKey: [...CARE_EVENTS_KEY, plantId],
        enabled: !!plantId,
        queryFn: async () => {
            const response = await fetch(`/api/today/care-events?plantId=${plantId}`);

            if (!response.ok) {
                throw new Error(`Failed to fetch care events: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => parseCareEvent(item as Record<string, unknown>));
        }
    });
}

export function useAllCareEvents() {
    return useQuery<CareEvent[]>({
        queryKey: CARE_EVENTS_KEY,
        queryFn: async () => {
            const response = await fetch("/api/today/care-events");

            if (!response.ok) {
                throw new Error(`Failed to fetch care events: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => parseCareEvent(item as Record<string, unknown>));
        }
    });
}
