import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parsePlant } from "@packages/api/entities/plants";

const API_BASE = "/api/today/plants";
const QUERY_KEY = ["today", "plants", "list"];

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

            return parsePlant(await response.json());
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    });
}
