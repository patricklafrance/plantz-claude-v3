import { delay, http, HttpResponse } from "msw";

import type { CareEvent } from "../../entities/care-events/types.ts";
import type { ResponsibilityAssignment } from "../../entities/household/types.ts";
import type { Plant } from "../../entities/plants/types.ts";

type PlantsData = Plant[] | "loading" | "error";
type CareEventsData = CareEvent[] | "empty";
type AssignmentsData = ResponsibilityAssignment[] | "empty";

interface PlantHandlerOptions {
    assignments?: ResponsibilityAssignment[];
}

export function createTodayPlantHandlers(data: PlantsData, options?: PlantHandlerOptions) {
    return [
        http.get("/api/today/plants", async () => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json([]);
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            // Attach assignment info when provided
            if (options?.assignments) {
                const assignmentMap = new Map(options.assignments.map(a => [a.plantId, a]));
                const plantsWithAssignments = data.map(plant => Object.assign({}, plant, { assignment: assignmentMap.get(plant.id) ?? null }));

                return HttpResponse.json(plantsWithAssignments);
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

export function createAssignmentHandlers(data: AssignmentsData) {
    const store = data === "empty" ? [] : [...data];

    return [
        http.get("/api/today/assignments", ({ request }) => {
            const url = new URL(request.url);
            const householdId = url.searchParams.get("householdId");

            if (!householdId) {
                return HttpResponse.json([]);
            }

            return HttpResponse.json(store.filter(a => a.householdId === householdId));
        }),

        http.post("/api/today/assignments", async ({ request }) => {
            const body = (await request.json()) as Record<string, unknown>;

            const assignment: ResponsibilityAssignment = {
                id: crypto.randomUUID(),
                plantId: body.plantId as string,
                householdId: body.householdId as string,
                assignedUserId: body.assignedUserId as string | null,
                assignedUserName: body.assignedUserName as string | null
            };

            store.push(assignment);

            return HttpResponse.json(assignment, { status: 201 });
        }),

        http.put("/api/today/assignments/:id", async ({ params, request }) => {
            const { id } = params;
            const body = (await request.json()) as Record<string, unknown>;
            const index = store.findIndex(a => a.id === id);

            if (index === -1) {
                return new HttpResponse(null, { status: 404 });
            }

            store[index] = { ...store[index]!, ...body } as ResponsibilityAssignment;

            return HttpResponse.json(store[index]);
        }),

        http.delete("/api/today/assignments/:id", ({ params }) => {
            const { id } = params;
            const index = store.findIndex(a => a.id === id);

            if (index === -1) {
                return new HttpResponse(null, { status: 404 });
            }

            store.splice(index, 1);

            return new HttpResponse(null, { status: 204 });
        })
    ];
}
