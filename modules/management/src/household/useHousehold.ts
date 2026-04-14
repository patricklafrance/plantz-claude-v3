import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Household, HouseholdMember, Invitation } from "@packages/api/entities/household";
import { parseHousehold, parseHouseholdMember, parseInvitation } from "@packages/api/entities/household";

const API_BASE = "/api/management/household";
const HOUSEHOLD_KEY = ["management", "household"];
const MEMBERS_KEY = ["management", "household", "members"];
const INVITATIONS_KEY = ["management", "household", "invitations"];

export function useHousehold() {
    return useQuery<Household | null>({
        queryKey: HOUSEHOLD_KEY,
        queryFn: async () => {
            const response = await fetch(API_BASE);

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

export function useCreateHousehold() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { name: string }) => {
            const response = await fetch(API_BASE, {
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
            queryClient.invalidateQueries({ queryKey: HOUSEHOLD_KEY });
            queryClient.invalidateQueries({ queryKey: MEMBERS_KEY });
        }
    });
}

export function useHouseholdMembers(householdId: string | undefined) {
    return useQuery<HouseholdMember[]>({
        queryKey: [...MEMBERS_KEY, householdId],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/${householdId}/members`);

            if (!response.ok) {
                throw new Error(`Failed to fetch members: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => parseHouseholdMember(item as Record<string, unknown>));
        },
        enabled: !!householdId
    });
}

export function useHouseholdInvitations(householdId: string | undefined) {
    return useQuery<Invitation[]>({
        queryKey: [...INVITATIONS_KEY, householdId],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/${householdId}/invitations`);

            if (!response.ok) {
                throw new Error(`Failed to fetch invitations: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => parseInvitation(item as Record<string, unknown>));
        },
        enabled: !!householdId
    });
}

export function useSendInvitation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ householdId, email }: { householdId: string; email: string }) => {
            const response = await fetch(`${API_BASE}/${householdId}/invitations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            if (!response.ok) {
                throw new Error(`Failed to send invitation: ${response.status}`);
            }

            return parseInvitation(await response.json());
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: [...INVITATIONS_KEY, variables.householdId] });
        }
    });
}
