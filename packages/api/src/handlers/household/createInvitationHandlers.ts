import { delay, http, HttpResponse } from "msw";

import type { Invitation } from "../../entities/invitation/types.ts";

interface InvitationWithHouseholdName extends Invitation {
    householdName: string;
}

interface InvitationData {
    outgoing: Invitation[] | "loading" | "error";
    incoming: InvitationWithHouseholdName[] | "loading" | "error";
}

export function createInvitationHandlers(data: InvitationData) {
    return [
        http.get("/api/household/invitations", async ({ request }) => {
            const url = new URL(request.url);
            const direction = url.searchParams.get("direction");

            if (direction === "incoming") {
                if (data.incoming === "loading") {
                    await delay("infinite");

                    return HttpResponse.json([]);
                }

                if (data.incoming === "error") {
                    return new HttpResponse(null, { status: 500 });
                }

                return HttpResponse.json(data.incoming);
            }

            // outgoing
            if (data.outgoing === "loading") {
                await delay("infinite");

                return HttpResponse.json([]);
            }

            if (data.outgoing === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            return HttpResponse.json(data.outgoing);
        }),

        http.post("/api/household/:id/invitations", () => HttpResponse.json({}, { status: 201 })),

        http.put("/api/household/invitations/:id", () => HttpResponse.json({}, { status: 200 }))
    ];
}
