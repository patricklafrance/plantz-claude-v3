import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { usersDb } from "../../db/auth/usersDb.ts";

export const managementUserHandlers = [
    http.put("/api/management/user/profile", async ({ request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const body = (await request.json()) as { name: string };
        const user = usersDb.updateName(userId, body.name);

        if (!user) {
            return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json({ id: user.id, name: user.name, email: user.email });
    })
];
