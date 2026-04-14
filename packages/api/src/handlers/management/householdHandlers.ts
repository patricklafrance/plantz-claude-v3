import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { householdMembersDb } from "../../db/household/householdMembersDb.ts";
import { householdsDb } from "../../db/household/householdsDb.ts";
import { invitationsDb } from "../../db/household/invitationsDb.ts";
import type { Invitation } from "../../entities/household/types.ts";

function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const managementHouseholdHandlers = [
    // Get the current user's household
    http.get("/api/management/household", () => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        // Find a household where the user is a member
        const membership = householdMembersDb.getAllByUser(userId)[0];

        if (!membership) {
            return HttpResponse.json(null);
        }

        const household = householdsDb.get(membership.householdId);

        if (!household) {
            return HttpResponse.json(null);
        }

        return HttpResponse.json(household);
    }),

    // Create a household
    http.post("/api/management/household", async ({ request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const body = (await request.json()) as Record<string, unknown>;
        const now = new Date();

        const household = householdsDb.insert({
            id: generateId(),
            name: body.name as string,
            createdBy: userId,
            creationDate: now
        });

        // Add the creator as owner
        householdMembersDb.insert({
            id: generateId(),
            householdId: household.id,
            userId,
            role: "owner",
            joinedDate: now
        });

        return HttpResponse.json(household, { status: 201 });
    }),

    // Get members of a household
    http.get("/api/management/household/:id/members", ({ params }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const { id } = params;
        const members = householdMembersDb.getAllByHousehold(id as string);

        return HttpResponse.json(members);
    }),

    // Get invitations for a household
    http.get("/api/management/household/:id/invitations", ({ params }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const { id } = params;
        const invitations = invitationsDb.getAllByHousehold(id as string);

        return HttpResponse.json(invitations);
    }),

    // Send an invitation
    http.post("/api/management/household/:id/invitations", async ({ params, request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const { id } = params;
        const body = (await request.json()) as Record<string, unknown>;
        const now = new Date();

        const invitation: Invitation = {
            id: generateId(),
            householdId: id as string,
            email: body.email as string,
            status: "pending",
            createdBy: userId,
            creationDate: now
        };

        invitationsDb.insert(invitation);

        return HttpResponse.json(invitation, { status: 201 });
    })
];
