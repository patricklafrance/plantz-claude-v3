import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { Button, Input, Label } from "@packages/components";
import { sessionQueryOptions, useSession } from "@packages/core-module";

export function UserPage() {
    const session = useSession();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [name, setName] = useState(session?.name ?? "");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmed = name.trim();

        if (!trimmed) {
            setError("Username cannot be empty.");

            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch("/api/management/user/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name: trimmed })
            });

            if (!response.ok) {
                setError("Failed to update username.");

                return;
            }

            await queryClient.fetchQuery(sessionQueryOptions());
            navigate("/", { replace: true });
        } catch {
            setError("An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <form onSubmit={handleSubmit} className="bg-card border-border/50 w-full max-w-sm space-y-4 rounded-xl border p-8 shadow-lg">
                <h1 className="text-foreground font-display text-2xl font-semibold tracking-tight">Edit profile</h1>
                {error && (
                    <p id="username-error" className="text-destructive text-sm" role="alert">
                        {error}
                    </p>
                )}
                <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        aria-invalid={error ? "true" : undefined}
                        aria-describedby={error ? "username-error" : undefined}
                        autoComplete="name"
                    />
                </div>
                <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save"}
                    </Button>
                    <Button type="button" variant="outline" className="flex-1" onClick={() => navigate(-1)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
