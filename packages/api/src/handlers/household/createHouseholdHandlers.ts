import { delay, http, HttpResponse } from "msw";

import type { Household, HouseholdMember } from "../../entities/household/types.ts";

interface HouseholdData {
    household: Household | null | "loading" | "error";
    members: HouseholdMember[] | "loading" | "error";
}

export function createHouseholdHandlers(data: HouseholdData) {
    return [
        http.get("/api/household", async () => {
            if (data.household === "loading") {
                await delay("infinite");

                return HttpResponse.json(null);
            }

            if (data.household === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            if (data.household === null) {
                return new HttpResponse(null, { status: 404 });
            }

            return HttpResponse.json(data.household);
        }),

        http.get("/api/household/members", async () => {
            if (data.members === "loading") {
                await delay("infinite");

                return HttpResponse.json([]);
            }

            if (data.members === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            return HttpResponse.json(data.members);
        }),

        http.post("/api/household", () => HttpResponse.json({}, { status: 201 }))
    ];
}
