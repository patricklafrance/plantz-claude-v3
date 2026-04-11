import { delay, http, HttpResponse } from "msw";

import type { Plant } from "../../entities/plants/types.ts";

type PlantsData = Plant[] | "loading" | "error";

export function createManagementPlantHandlers(data: PlantsData) {
    return [
        http.get("/api/management/plants", async () => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json([]);
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            return HttpResponse.json(data);
        }),
        http.get("/api/management/plants/:id", ({ params }) => {
            if (typeof data === "string") {
                return new HttpResponse(null, { status: 404 });
            }

            const plant = data.find(p => p.id === params.id);

            return plant ? HttpResponse.json(plant) : new HttpResponse(null, { status: 404 });
        }),
        http.post("/api/management/plants", () => HttpResponse.json({}, { status: 201 })),
        http.put("/api/management/plants/:id", () => HttpResponse.json({}, { status: 200 })),
        http.delete("/api/management/plants/:id", () => new HttpResponse(null, { status: 204 })),
        http.delete("/api/management/plants", () => new HttpResponse(null, { status: 204 }))
    ];
}
