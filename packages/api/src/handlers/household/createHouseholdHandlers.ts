import { delay, http, HttpResponse } from "msw";

import type { Household } from "../../entities/household/types.ts";

type HouseholdData = Household | "none" | "loading" | "error";

export function createHouseholdHandlers(data: HouseholdData) {
    return [
        http.get("/api/household/me", async () => {
            if (data === "loading") {
                await delay("infinite");

                return HttpResponse.json({});
            }

            if (data === "error") {
                return new HttpResponse(null, { status: 500 });
            }

            if (data === "none") {
                return new HttpResponse(null, { status: 404 });
            }

            return HttpResponse.json({ id: data.id, name: data.name });
        })
    ];
}
