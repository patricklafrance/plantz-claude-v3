import { delay, http, HttpResponse } from "msw";

import type { CareEvent } from "../../entities/care-events/types.ts";
import type { Plant } from "../../entities/plants/types.ts";

type PlantsData = Plant[] | "loading" | "error";
type CareEventsData = CareEvent[] | "empty";

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
        http.delete("/api/today/plants/:id", () => new HttpResponse(null, { status: 204 })),
        http.delete("/api/today/plants", () => new HttpResponse(null, { status: 204 }))
    ];
}

export function createCareEventHandlers(data: CareEventsData) {
    return [
        http.get("/api/today/care-events", () => {
            if (data === "empty") {
                return HttpResponse.json([]);
            }

            return HttpResponse.json(data);
        }),
        http.post("/api/today/care-events", () => HttpResponse.json({}, { status: 201 }))
    ];
}
