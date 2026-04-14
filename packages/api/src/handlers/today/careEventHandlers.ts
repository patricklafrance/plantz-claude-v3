import { http, HttpResponse } from "msw";

import { careEventsDb } from "../../db/care-events/careEventsDb.ts";
import type { CareEvent } from "../../entities/care-events/types.ts";

export const todayCareEventHandlers = [
    http.get("/api/today/care-events", ({ request }) => {
        const url = new URL(request.url);
        const plantId = url.searchParams.get("plantId");

        if (plantId) {
            return HttpResponse.json(careEventsDb.getAllByPlant(plantId));
        }

        return HttpResponse.json(careEventsDb.getAll());
    }),

    http.post("/api/today/care-events", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;

        const event: CareEvent = {
            id: crypto.randomUUID(),
            plantId: body.plantId as string,
            actorId: body.actorId as string,
            actorName: body.actorName as string,
            eventType: body.eventType as "watered",
            timestamp: new Date(body.timestamp as string)
        };

        careEventsDb.insert(event);

        return HttpResponse.json(event, { status: 201 });
    })
];
