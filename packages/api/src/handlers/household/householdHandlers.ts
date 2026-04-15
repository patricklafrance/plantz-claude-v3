import { http, HttpResponse } from "msw";

import { getUserId } from "../../db/auth/getUserId.ts";
import { usersDb } from "../../db/auth/usersDb.ts";
import { householdDb, householdMembersDb } from "../../db/household/householdDb.ts";
import { generateId } from "../../db/utils/generateId.ts";
import type { Household, HouseholdMember } from "../../entities/household/types.ts";

export const householdHandlers = [
    http.get("/api/household", () => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const household = householdDb.getByMember(userId);

        if (!household) {
            return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json(household);
    }),

    http.get("/api/household/members", () => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const household = householdDb.getByMember(userId);

        if (!household) {
            return HttpResponse.json([]);
        }

        const members = householdMembersDb.getByHousehold(household.id);

        return HttpResponse.json(members);
    }),

    http.post("/api/household", async ({ request }) => {
        const userId = getUserId();

        if (!userId) {
            return new HttpResponse(null, { status: 401 });
        }

        const body = (await request.json()) as Record<string, unknown>;
        const now = new Date();

        const id = generateId();

        const user = usersDb.getById(userId);

        const household = householdDb.insert({
            ...(body as Record<string, unknown>),
            id,
            createdByUserId: userId,
            creationDate: now
        } as Household);

        householdMembersDb.insert({
            householdId: id,
            userId,
            userName: user?.name ?? "Unknown",
            role: "owner",
            joinedDate: now
        } as HouseholdMember);

        return HttpResponse.json(household, { status: 201 });
    })
];
