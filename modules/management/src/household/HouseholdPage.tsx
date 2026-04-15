import { useState, type FormEvent } from "react";

import { Button, Input, Label } from "@packages/components";

import { useCreateHousehold, useHousehold, useHouseholdMembers } from "./useHousehold.ts";
import { useCreateInvitation, useIncomingInvitations, useOutgoingInvitations, useRespondToInvitation } from "./useInvitations.ts";

export function HouseholdPage() {
    const household = useHousehold();
    const members = useHouseholdMembers();

    if (household.isPending) {
        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-muted-foreground">Loading household...</p>
            </div>
        );
    }

    if (household.isError) {
        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-destructive">Failed to load household. Please try again.</p>
            </div>
        );
    }

    if (household.data === null) {
        return <NoHouseholdView />;
    }

    return (
        <div className="flex flex-1 flex-col gap-8 p-6">
            <h1 className="text-foreground font-display text-2xl font-semibold tracking-tight">{household.data.name}</h1>

            {/* Members section */}
            <section>
                <h2 className="text-foreground mb-3 text-lg font-semibold">Members</h2>
                {members.isPending ? (
                    <p className="text-muted-foreground">Loading members...</p>
                ) : members.isError ? (
                    <p className="text-destructive">Failed to load members.</p>
                ) : (
                    <ul className="space-y-2">
                        {members.data?.map(member => (
                            <li
                                key={member.userId}
                                className="bg-card border-border/50 flex items-center justify-between rounded-lg border px-4 py-3"
                            >
                                <span className="text-foreground">{member.userName}</span>
                                <span className="text-muted-foreground text-sm capitalize">{member.role}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Invite member section */}
            <InviteMemberSection householdId={household.data.id} />

            {/* Pending invitations section */}
            <PendingInvitationsSection />

            {/* Incoming invitations section */}
            <IncomingInvitationsSection />
        </div>
    );
}

function NoHouseholdView() {
    const [isCreating, setIsCreating] = useState(false);
    const [householdName, setHouseholdName] = useState("");
    const createHousehold = useCreateHousehold();

    function handleSubmitCreate(e: FormEvent) {
        e.preventDefault();

        const trimmed = householdName.trim();

        if (!trimmed) {
            return;
        }

        createHousehold.mutate(
            { name: trimmed },
            {
                onSuccess: () => {
                    setHouseholdName("");
                    setIsCreating(false);
                }
            }
        );
    }

    if (isCreating) {
        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <form onSubmit={handleSubmitCreate} className="bg-card border-border/50 w-full max-w-sm space-y-4 rounded-xl border p-8 shadow-lg">
                    <h1 className="text-foreground font-display text-2xl font-semibold tracking-tight">Create Household</h1>
                    <div className="space-y-2">
                        <Label htmlFor="household-name">Household name</Label>
                        <Input
                            id="household-name"
                            type="text"
                            value={householdName}
                            onChange={e => setHouseholdName(e.target.value)}
                            placeholder="Enter household name"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" className="flex-1" disabled={createHousehold.isPending || !householdName.trim()}>
                            {createHousehold.isPending ? "Creating..." : "Create"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setIsCreating(false)}
                            disabled={createHousehold.isPending}
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <div className="bg-card border-border/50 w-full max-w-sm space-y-4 rounded-xl border p-8 text-center shadow-lg">
                <h1 className="text-foreground font-display text-2xl font-semibold tracking-tight">No Household</h1>
                <p className="text-muted-foreground">You are not part of any household yet.</p>
                <Button onClick={() => setIsCreating(true)} className="w-full">
                    Create Household
                </Button>
            </div>
        </div>
    );
}

function InviteMemberSection({ householdId }: { householdId: string }) {
    const [email, setEmail] = useState("");
    const createInvitation = useCreateInvitation();

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        const trimmed = email.trim();

        if (!trimmed) {
            return;
        }

        createInvitation.mutate(
            { householdId, inviteeEmail: trimmed },
            {
                onSuccess: () => {
                    setEmail("");
                }
            }
        );
    }

    return (
        <section>
            <h2 className="text-foreground mb-3 text-lg font-semibold">Invite Member</h2>
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
                <div className="flex-1 space-y-2">
                    <Label htmlFor="invite-email">Email address</Label>
                    <Input id="invite-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email address" />
                </div>
                <Button type="submit" disabled={createInvitation.isPending || !email.trim()}>
                    {createInvitation.isPending ? "Sending..." : "Send Invite"}
                </Button>
            </form>
        </section>
    );
}

function PendingInvitationsSection() {
    const outgoing = useOutgoingInvitations();

    if (outgoing.isPending) {
        return (
            <section>
                <h2 className="text-foreground mb-3 text-lg font-semibold">Pending Invitations</h2>
                <p className="text-muted-foreground">Loading invitations...</p>
            </section>
        );
    }

    if (outgoing.isError) {
        return (
            <section>
                <h2 className="text-foreground mb-3 text-lg font-semibold">Pending Invitations</h2>
                <p className="text-destructive">Failed to load invitations.</p>
            </section>
        );
    }

    const pendingInvitations = outgoing.data?.filter(inv => inv.status === "pending") ?? [];

    if (pendingInvitations.length === 0) {
        return (
            <section>
                <h2 className="text-foreground mb-3 text-lg font-semibold">Pending Invitations</h2>
                <p className="text-muted-foreground">No pending invitations.</p>
            </section>
        );
    }

    return (
        <section>
            <h2 className="text-foreground mb-3 text-lg font-semibold">Pending Invitations</h2>
            <ul className="space-y-2">
                {pendingInvitations.map(invitation => (
                    <li key={invitation.id} className="bg-card border-border/50 flex items-center justify-between rounded-lg border px-4 py-3">
                        <span className="text-foreground">{invitation.inviteeEmail}</span>
                        <span className="text-muted-foreground text-sm capitalize">{invitation.status}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function IncomingInvitationsSection() {
    const incoming = useIncomingInvitations();
    const respond = useRespondToInvitation();

    if (incoming.isPending) {
        return (
            <section>
                <h2 className="text-foreground mb-3 text-lg font-semibold">Incoming Invitations</h2>
                <p className="text-muted-foreground">Loading invitations...</p>
            </section>
        );
    }

    if (incoming.isError) {
        return (
            <section>
                <h2 className="text-foreground mb-3 text-lg font-semibold">Incoming Invitations</h2>
                <p className="text-destructive">Failed to load invitations.</p>
            </section>
        );
    }

    if (!incoming.data || incoming.data.length === 0) {
        return null;
    }

    return (
        <section>
            <h2 className="text-foreground mb-3 text-lg font-semibold">Incoming Invitations</h2>
            <ul className="space-y-2">
                {incoming.data.map(invitation => (
                    <li key={invitation.id} className="bg-card border-border/50 flex items-center justify-between rounded-lg border px-4 py-3">
                        <span className="text-foreground">{invitation.householdName}</span>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => respond.mutate({ id: invitation.id, status: "accepted" })} disabled={respond.isPending}>
                                {respond.isPending && respond.variables?.id === invitation.id && respond.variables?.status === "accepted"
                                    ? "Accepting..."
                                    : "Accept"}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => respond.mutate({ id: invitation.id, status: "declined" })}
                                disabled={respond.isPending}
                            >
                                {respond.isPending && respond.variables?.id === invitation.id && respond.variables?.status === "declined"
                                    ? "Declining..."
                                    : "Decline"}
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
