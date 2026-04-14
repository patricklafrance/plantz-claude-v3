import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parseHousehold, parseHouseholdMember } from "@packages/api/entities/household";

const HOUSEHOLD_QUERY_KEY = ["management", "household"];
const MEMBERS_QUERY_KEY = ["management", "household", "members"];

export function useHousehold() {
    return useQuery({
        queryKey: HOUSEHOLD_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/household");

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch household: ${response.status}`);
            }

            const data: Record<string, unknown> = await response.json();

            return parseHousehold(data);
        }
    });
}

export function useHouseholdMembers() {
    return useQuery({
        queryKey: MEMBERS_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/household/members");

            if (!response.ok) {
                throw new Error(`Failed to fetch household members: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => parseHouseholdMember(item as Record<string, unknown>));
        }
    });
}

export function useCreateHousehold() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { name: string }) => {
            const response = await fetch("/api/household", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Failed to create household: ${response.status}`);
            }

            return parseHousehold(await response.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: HOUSEHOLD_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: MEMBERS_QUERY_KEY });
        }
    });
}
