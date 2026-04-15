import { useQuery } from "@tanstack/react-query";

import type { Household } from "@packages/api/entities/household";

const HOUSEHOLD_ME_QUERY_KEY = ["household", "me"];

export function useHouseholdMe() {
    return useQuery({
        queryKey: HOUSEHOLD_ME_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/household");

            if (response.status === 404) {
                return null;
            }

            if (!response.ok) {
                throw new Error(`Failed to fetch household: ${response.status}`);
            }

            return (await response.json()) as Household;
        }
    });
}
