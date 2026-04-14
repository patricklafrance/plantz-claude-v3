import { useState, type FormEvent } from "react";

import { Badge, Button, Input, Label, Separator } from "@packages/components";

import { useHousehold, useCreateHousehold, useHouseholdMembers, useHouseholdInvitations, useSendInvitation } from "./useHousehold.ts";

function CreateHouseholdForm() {
    const [name, setName] = useState("");
    const createHousehold = useCreateHousehold();

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        const trimmed = name.trim();

        if (!trimmed) {
            return;
        }

        createHousehold.mutate({ name: trimmed });
    }

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <form onSubmit={handleSubmit} className="bg-card border-border/50 w-full max-w-sm space-y-4 rounded-xl border p-8 shadow-lg">
                <h1 className="text-foreground font-display text-2xl font-semibold tracking-tight">Create a Household</h1>
                <p className="text-muted-foreground text-sm">
                    You don&apos;t have a household yet. Create one to start collaborating on plant care with others.
                </p>
                <div className="space-y-2">
                    <Label htmlFor="household-name">Household name</Label>
                    <Input
                        id="household-name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Green Thumb Family"
                        autoComplete="off"
                    />
                </div>
                <Button type="submit" className="w-full" disabled={createHousehold.isPending || !name.trim()}>
                    {createHousehold.isPending ? "Creating..." : "Create household"}
                </Button>
            </form>
        </div>
    );
}

function InvitationForm({ householdId }: { householdId: string }) {
    const [email, setEmail] = useState("");
    const sendInvitation = useSendInvitation();

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        const trimmed = email.trim();

        if (!trimmed) {
            return;
        }

        sendInvitation.mutate(
            { householdId, email: trimmed },
            {
                onSuccess: () => setEmail("")
            }
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter email address"
                autoComplete="email"
                className="flex-1"
            />
            <Button type="submit" disabled={sendInvitation.isPending || !email.trim()}>
                {sendInvitation.isPending ? "Sending..." : "Invite"}
            </Button>
        </form>
    );
}

function HouseholdView({ householdId, householdName }: { householdId: string; householdName: string }) {
    const { data: members, isPending: membersLoading } = useHouseholdMembers(householdId);
    const { data: invitations, isPending: invitationsLoading } = useHouseholdInvitations(householdId);

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
            <div>
                <h1 className="text-foreground font-display text-2xl font-semibold tracking-tight">{householdName}</h1>
                <p className="text-muted-foreground text-sm">Manage your household members and invitations.</p>
            </div>

            <Separator />

            <section className="space-y-3">
                <h2 className="text-foreground text-lg font-medium">Members</h2>
                {membersLoading ? (
                    <p className="text-muted-foreground text-sm">Loading members...</p>
                ) : members && members.length > 0 ? (
                    <ul className="space-y-2">
                        {members.map(member => (
                            <li key={member.id} className="bg-card border-border/50 flex items-center justify-between rounded-lg border px-4 py-3">
                                <span className="text-foreground text-sm font-medium">{member.userId}</span>
                                <Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role}</Badge>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground text-sm">No members found.</p>
                )}
            </section>

            <Separator />

            <section className="space-y-3">
                <h2 className="text-foreground text-lg font-medium">Pending Invitations</h2>
                {invitationsLoading ? (
                    <p className="text-muted-foreground text-sm">Loading invitations...</p>
                ) : invitations && invitations.filter(inv => inv.status === "pending").length > 0 ? (
                    <ul className="space-y-2">
                        {invitations
                            .filter(inv => inv.status === "pending")
                            .map(invitation => (
                                <li
                                    key={invitation.id}
                                    className="bg-card border-border/50 flex items-center justify-between rounded-lg border border-dashed px-4 py-3"
                                >
                                    <span className="text-muted-foreground text-sm">{invitation.email}</span>
                                    <Badge variant="outline">pending</Badge>
                                </li>
                            ))}
                    </ul>
                ) : (
                    <p className="text-muted-foreground text-sm">No pending invitations.</p>
                )}
            </section>

            <Separator />

            <section className="space-y-3">
                <h2 className="text-foreground text-lg font-medium">Invite a Member</h2>
                <InvitationForm householdId={householdId} />
            </section>
        </div>
    );
}

export function HouseholdPage() {
    const { data: household, isPending, isError } = useHousehold();

    if (isPending) {
        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-destructive text-sm">Failed to load household data.</p>
            </div>
        );
    }

    if (!household) {
        return <CreateHouseholdForm />;
    }

    return <HouseholdView householdId={household.id} householdName={household.name} />;
}
