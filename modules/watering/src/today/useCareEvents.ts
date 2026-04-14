import { useQuery } from "@tanstack/react-query";

interface CareEventResult {
    id: string;
    action: string;
    performedDate: Date;
    actorName: string;
}

export function useCareEvents(plantId: string | null) {
    return useQuery({
        queryKey: ["today", "care-events", plantId],
        queryFn: async () => {
            if (!plantId) {
                return { events: [] as CareEventResult[] };
            }

            const res = await fetch(`/api/today/plants/${plantId}/care-events`);

            if (!res.ok) {
                throw new Error(`Failed to fetch care events: ${res.status}`);
            }

            const data = await res.json();

            return {
                events: (data.events as Record<string, unknown>[]).map(e => ({
                    id: e.id as string,
                    action: e.action as string,
                    performedDate: new Date(e.performedDate as string),
                    actorName: e.actorName as string
                }))
            };
        },
        enabled: !!plantId
    });
}
