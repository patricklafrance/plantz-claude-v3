import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { type CareEvent, parseCareEvent } from "@packages/api/entities/care-events";
import { parsePlant } from "@packages/api/entities/plants";
import { useSession } from "@packages/core-module";

const API_BASE = "/api/today/plants";
const QUERY_KEY = ["today", "plants", "list"];
const CARE_EVENTS_KEY = ["today", "care-events"];

export function useTodayPlants() {
    return useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const response = await fetch(API_BASE);

            if (!response.ok) {
                throw new Error(`Failed to fetch plants: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => parsePlant(item as Record<string, unknown>));
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

            // Record a care event with the current user as actor
            if (session) {
                await fetch("/api/today/care-events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        plantId: id,
                        actorId: session.id,
                        actorName: session.name,
                        eventType: "watered",
                        timestamp: new Date().toISOString()
                    })
                });
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
