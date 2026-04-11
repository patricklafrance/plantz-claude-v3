import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Plant } from "@packages/api/entities/plants";
import { parsePlant } from "@packages/api/entities/plants";

const API_BASE = "/api/management/plants";
const QUERY_KEY = ["management", "plants", "list"];

export function useManagementPlants() {
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

export function useCreatePlant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Omit<Plant, "id" | "userId" | "creationDate" | "lastUpdateDate">) => {
            const response = await fetch(API_BASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Failed to create plant: ${response.status}`);
            }

            return parsePlant(await response.json());
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    });
}

export function useUpdatePlant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<Plant>) => {
            const response = await fetch(`${API_BASE}/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Failed to update plant ${id}: ${response.status}`);
            }

            return parsePlant(await response.json());
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    });
}

export function useDeletePlant() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`${API_BASE}/${id}`, {
                method: "DELETE"
            });

            if (!response.ok) {
                throw new Error(`Failed to delete plant ${id}: ${response.status}`);
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    });
}

export function useDeletePlants() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (ids: string[]) => {
            const response = await fetch(API_BASE, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids })
            });

            if (!response.ok) {
                throw new Error(`Failed to delete plants: ${response.status}`);
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    });
}
