import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Invitation } from "@packages/api/entities/invitation";
import { parseInvitation } from "@packages/api/entities/invitation";

const OUTGOING_QUERY_KEY = ["management", "invitations", "outgoing"];
const INCOMING_QUERY_KEY = ["management", "invitations", "incoming"];

interface IncomingInvitation extends Invitation {
    householdName: string;
}

export function useOutgoingInvitations() {
    return useQuery({
        queryKey: OUTGOING_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/household/invitations?direction=outgoing");

            if (!response.ok) {
                throw new Error(`Failed to fetch outgoing invitations: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => parseInvitation(item as Record<string, unknown>));
        }
    });
}

export function useIncomingInvitations() {
    return useQuery({
        queryKey: INCOMING_QUERY_KEY,
        queryFn: async () => {
            const response = await fetch("/api/household/invitations?direction=incoming");

            if (!response.ok) {
                throw new Error(`Failed to fetch incoming invitations: ${response.status}`);
            }

            const data: unknown[] = await response.json();

            return data.map(item => {
                const parsed = parseInvitation(item as Record<string, unknown>);

                return Object.assign({}, parsed, {
                    householdName: (item as Record<string, unknown>).householdName as string
                }) as IncomingInvitation;
            });
        }
    });
}

export function useCreateInvitation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ householdId, inviteeEmail }: { householdId: string; inviteeEmail: string }) => {
            const response = await fetch(`/api/household/${householdId}/invitations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ inviteeEmail })
            });

            if (!response.ok) {
                throw new Error(`Failed to create invitation: ${response.status}`);
            }

            return parseInvitation(await response.json());
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: OUTGOING_QUERY_KEY })
    });
}

export function useRespondToInvitation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: "accepted" | "declined" }) => {
            const response = await fetch(`/api/household/invitations/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                throw new Error(`Failed to respond to invitation: ${response.status}`);
            }

            return parseInvitation(await response.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INCOMING_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ["management", "household"] });
            queryClient.invalidateQueries({ queryKey: ["management", "household", "members"] });
        }
    });
}
