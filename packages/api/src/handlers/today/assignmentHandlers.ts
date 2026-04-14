import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { responsibilityAssignmentsDb } from "../../db/household/responsibilityAssignmentsDb.ts";
import type { ResponsibilityAssignment } from "../../entities/household/types.ts";

export const todayAssignmentHandlers = [
    http.get("/api/today/assignments", ({ request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const url = new URL(request.url);
        const householdId = url.searchParams.get("householdId");

        if (!householdId) {
            return HttpResponse.json([]);
        }

        return HttpResponse.json(responsibilityAssignmentsDb.getAllByHousehold(householdId));
    }),

    http.post("/api/today/assignments", async ({ request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const body = (await request.json()) as Record<string, unknown>;

        const assignment: ResponsibilityAssignment = {
            id: crypto.randomUUID(),
            plantId: body.plantId as string,
            householdId: body.householdId as string,
            assignedUserId: body.assignedUserId as string | null,
            assignedUserName: body.assignedUserName as string | null
        };

        responsibilityAssignmentsDb.insert(assignment);

        return HttpResponse.json(assignment, { status: 201 });
    }),

    http.put("/api/today/assignments/:id", async ({ params, request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const { id } = params;
        const body = (await request.json()) as Record<string, unknown>;
        const updated = responsibilityAssignmentsDb.update(id as string, body);

        if (!updated) {
            return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json(updated);
    }),

    http.delete("/api/today/assignments/:id", ({ params }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const { id } = params;
        const deleted = responsibilityAssignmentsDb.delete(id as string);

        if (!deleted) {
            return new HttpResponse(null, { status: 404 });
        }

        return new HttpResponse(null, { status: 204 });
    })
];
