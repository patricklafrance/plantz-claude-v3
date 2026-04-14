import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { usersDb } from "../../db/auth/usersDb.ts";
import { householdDb, householdMembersDb } from "../../db/household/householdDb.ts";
import { invitationDb } from "../../db/invitation/invitationDb.ts";
import type { Invitation } from "../../entities/invitation/types.ts";

export const invitationHandlers = [
    // Create an invitation for a household
    http.post("/api/household/:id/invitations", async ({ params, request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const { id: householdId } = params;
        const household = householdDb.get(householdId as string);

        if (!household) {
            return new HttpResponse(null, { status: 404 });
        }

        const body = (await request.json()) as Record<string, unknown>;

        const invitationId =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        const invitation = invitationDb.insert({
            id: invitationId,
            householdId: householdId as string,
            inviteeEmail: body.inviteeEmail as string,
            status: "pending",
            createdByUserId: userId,
            createdAt: new Date()
        } as Invitation);

        return HttpResponse.json(invitation, { status: 201 });
    }),

    // Get invitations for the current user (both outgoing created by the user, and incoming for the user's email)
    http.get("/api/household/invitations", ({ request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const url = new URL(request.url);
        const direction = url.searchParams.get("direction");

        const user = usersDb.getById(userId);

        if (direction === "incoming") {
            // Get pending invitations addressed to the current user's email
            const incoming = user ? invitationDb.getByEmail(user.email).filter(inv => inv.status === "pending") : [];

            // Enrich with household name
            const enriched = incoming.map(inv => {
                const household = householdDb.get(inv.householdId);

                return Object.assign({}, inv, { householdName: household?.name ?? "Unknown" });
            });

            return HttpResponse.json(enriched);
        }

        // Default: outgoing invitations created by the current user
        const outgoing = invitationDb.getByCreator(userId);

        return HttpResponse.json(outgoing);
    }),

    // Accept or decline an invitation
    http.put("/api/household/invitations/:id", async ({ params, request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const { id } = params;
        const body = (await request.json()) as { status: "accepted" | "declined" };
        const invitation = invitationDb.update(id as string, { status: body.status });

        if (!invitation) {
            return new HttpResponse(null, { status: 404 });
        }

        // When accepted, add the user as a member of the household
        if (body.status === "accepted") {
            const user = usersDb.getById(userId);

            householdMembersDb.insert({
                householdId: invitation.householdId,
                userId,
                userName: user?.name ?? "Unknown",
                role: "member",
                joinedDate: new Date()
            });
        }

        return HttpResponse.json(invitation);
    })
];
