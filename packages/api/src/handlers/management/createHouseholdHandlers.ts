import { delay, http, HttpResponse } from "msw";

import type { Household, HouseholdMember, Invitation } from "../../entities/household/types.ts";

interface HouseholdData {
    household: Household | null;
    members: HouseholdMember[];
    invitations: Invitation[];
}

type HouseholdHandlerData = HouseholdData | "loading" | "error";

function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createManagementHouseholdHandlers(data: HouseholdHandlerData) {
    return [
        http.get("/api/management/household", async () => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json(null);
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            return HttpResponse.json(data.household);
        }),

        http.post("/api/management/household", async ({ request }) => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json({}, { status: 201 });
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            const body = (await request.json()) as Record<string, unknown>;
            const now = new Date();

            const household: Household = {
                id: generateId(),
                name: body.name as string,
                createdBy: "user-alice",
                creationDate: now
            };

            return HttpResponse.json(household, { status: 201 });
        }),

        http.get("/api/management/household/:id/members", async () => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json([]);
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            return HttpResponse.json(data.members);
        }),

        http.get("/api/management/household/:id/invitations", async () => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json([]);
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            return HttpResponse.json(data.invitations);
        }),

        http.post("/api/management/household/:id/invitations", async ({ request }) => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json({}, { status: 201 });
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            const body = (await request.json()) as Record<string, unknown>;
            const now = new Date();

            const invitation: Invitation = {
                id: generateId(),
                householdId: "household-1",
                email: body.email as string,
                status: "pending",
                createdBy: "user-alice",
                creationDate: now
            };

            return HttpResponse.json(invitation, { status: 201 });
        })
    ];
}
