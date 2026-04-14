import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { householdDb } from "../../db/household/householdDb.ts";

export const householdHandlers = [
    http.get("/api/household/me", () => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const household = householdDb.getByUserId(userId);

        if (!household) {
            return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json({ id: household.id, name: household.name });
    })
];
