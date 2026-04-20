import { delay, http, HttpResponse } from "msw";

import type { Plant } from "../../entities/plants/types.ts";

type PlantsData = Plant[] | "loading" | "error";

interface CareEventData {
    id: string;
    action: string;
    performedDate: Date;
    actorName: string;
}

export function createTodayPlantHandlers(data: PlantsData) {
    return [
        http.get("/api/today/plants", async () => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json([]);
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            return HttpResponse.json(data);
        }),
        http.put("/api/today/plants/:id", () => HttpResponse.json({}, { status: 200 })),
        http.get("/api/today/plants/:id/care-events", () => HttpResponse.json({ events: [] })),
        http.delete("/api/today/plants/:id", () => new HttpResponse(null, { status: 204 })),
        http.delete("/api/today/plants", () => new HttpResponse(null, { status: 204 }))
    ];
}

export function createCareEventsHandler(_plantId: string, events: CareEventData[]) {
    return http.get("/api/today/plants/:id/care-events", () => {
        return HttpResponse.json({ events });
    });
}
