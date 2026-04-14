import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { householdMembersDb } from "../../db/household/householdMembersDb.ts";
import { responsibilityAssignmentsDb } from "../../db/household/responsibilityAssignmentsDb.ts";
import { plantsDb } from "../../db/plants/plantsDb.ts";

export const todayPlantHandlers = [
    http.get("/api/today/plants", () => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const ownPlants = plantsDb.getAllByUser(userId);

        // Find shared plants from household members
        const userMemberships = householdMembersDb.getAllByUser(userId);

        if (userMemberships.length > 0) {
            const householdId = userMemberships[0]!.householdId;
            const allMembers = householdMembersDb.getAllByHousehold(householdId);
            const ownPlantIds = new Set(ownPlants.map(p => p.id));

            for (const member of allMembers) {
                if (member.userId === userId) {
                    continue;
                }

                const memberPlants = plantsDb.getAllByUser(member.userId);

                for (const plant of memberPlants) {
                    if (plant.isShared && !ownPlantIds.has(plant.id)) {
                        ownPlants.push(plant);
                    }
                }
            }
        }

        // Attach assignment info to each plant
        const plantsWithAssignments = ownPlants.map(plant =>
            Object.assign({}, plant, { assignment: responsibilityAssignmentsDb.getByPlant(plant.id) ?? null })
        );

        return HttpResponse.json(plantsWithAssignments);
    }),

    http.put("/api/today/plants/:id", async ({ params, request }) => {
        const { id } = params;
        const body = (await request.json()) as Record<string, unknown>;
        const plant = plantsDb.update(id as string, body);

        if (!plant) {
            return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json(plant);
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
