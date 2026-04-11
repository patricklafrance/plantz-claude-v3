import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { usersDb } from "../../db/auth/usersDb.ts";
export const authHandlers = [
    http.post("/api/auth/login", async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string };
        const user = usersDb.getByEmail(body.email);

        if (!user || user.password !== body.password) {
            return new HttpResponse(null, { status: 401 });
        }

        sessionStorage.setItem("plantz-auth-token", user.id);

        return HttpResponse.json({ token: user.id });
    }),

    http.post("/api/auth/logout", () => {
        sessionStorage.removeItem("plantz-auth-token");

        return new HttpResponse(null, { status: 200 });
    }),

    http.get("/api/auth/session", () => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const user = usersDb.getById(userId);

        if (!user) {
            return new HttpResponse(null, { status: 401 });
        }

        return HttpResponse.json({ id: user.id, name: user.name, email: user.email });
    })
];
