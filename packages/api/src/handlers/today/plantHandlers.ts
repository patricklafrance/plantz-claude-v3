import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { usersDb } from "../../db/auth/usersDb.ts";
import { careEventsDb } from "../../db/care-events/careEventsDb.ts";
import { householdDb } from "../../db/household/householdDb.ts";
import { plantsDb } from "../../db/plants/plantsDb.ts";
import { generateId } from "../../db/utils/generateId.ts";

export const todayPlantHandlers = [
    http.get("/api/today/plants", () => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const userPlants = plantsDb.getAllByUser(userId);

        // Also include shared household plants
        const household = householdDb.getByMember(userId);
        let allPlants = userPlants;

        if (household) {
            const householdPlants = plantsDb.getAllByHousehold(household.id);
            // Merge, avoiding duplicates (plants owned by this user that also have householdId)
            const userPlantIds = new Set(userPlants.map(p => p.id));
            const additionalPlants = householdPlants.filter(p => !userPlantIds.has(p.id));
            allPlants = userPlants.concat(additionalPlants);
        }

        return HttpResponse.json(allPlants);
    }),

    http.put("/api/today/plants/:id", async ({ params, request }) => {
        const { id } = params;
        const body = (await request.json()) as Record<string, unknown>;
        const plant = plantsDb.update(id as string, body);

        if (!plant) {
            return new HttpResponse(null, { status: 404 });
        }

        const actorId = getUserId();
        let lastCareEvent: { actorName: string; performedDate: Date } | null = null;

        if (actorId) {
            const now = new Date();

            careEventsDb.insert({
                id: generateId(),
                plantId: id as string,
                userId: actorId,
                action: "watered",
                performedDate: now
            });

            const actor = usersDb.getById(actorId);

            if (actor) {
                lastCareEvent = { actorName: actor.name, performedDate: now };
            }
        }

        return HttpResponse.json({ ...plant, lastCareEvent });
    }),

    http.get("/api/today/plants/:id/care-events", ({ params }) => {
        const { id } = params;
        const events = careEventsDb.getByPlant(id as string).slice(0, 5);

        const resolved = events.map(e => {
            const actor = usersDb.getById(e.userId);

            return {
                id: e.id,
                action: e.action,
                performedDate: e.performedDate,
                actorName: actor?.name ?? "Unknown"
            };
        });

        return HttpResponse.json({ events: resolved });
    }),

    http.delete("/api/today/plants/:id", ({ params }) => {
        const { id } = params;
        const deleted = plantsDb.delete(id as string);

        if (!deleted) {
            return new HttpResponse(null, { status: 404 });
        }

        return new HttpResponse(null, { status: 204 });
    }),

    http.delete("/api/today/plants", async ({ request }) => {
        const body = (await request.json()) as { ids: string[] };
        plantsDb.deleteMany(body.ids);

        return new HttpResponse(null, { status: 204 });
    })
];
