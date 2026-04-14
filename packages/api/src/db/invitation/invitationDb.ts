import type { Invitation } from "../../entities/invitation/types.ts";

class InvitationDb {
    #store = new Map<string, Invitation>();

    getAll(): Invitation[] {
        return [...this.#store.values()];
    }

    getByHousehold(householdId: string): Invitation[] {
        return [...this.#store.values()].filter(inv => inv.householdId === householdId);
    }

    getByEmail(email: string): Invitation[] {
        return [...this.#store.values()].filter(inv => inv.inviteeEmail === email);
    }

    getByCreator(userId: string): Invitation[] {
        return [...this.#store.values()].filter(inv => inv.createdByUserId === userId);
    }

    get(id: string): Invitation | undefined {
        return this.#store.get(id);
    }

    insert(invitation: Invitation): Invitation {
        this.#store.set(invitation.id, invitation);

        return invitation;
    }

    update(id: string, data: Partial<Invitation>): Invitation | undefined {
        const existing = this.#store.get(id);

        if (!existing) {
            return undefined;
        }

        const updated: Invitation = { ...existing, ...data };
        this.#store.set(id, updated);

        return updated;
    }

    delete(id: string): boolean {
        return this.#store.delete(id);
    }

    reset(invitations: Invitation[]): void {
        this.#store.clear();

        for (const invitation of invitations) {
            this.#store.set(invitation.id, invitation);
        }
    }
}

export const invitationDb = new InvitationDb();
