import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";

import { Button, Input, Label } from "@packages/components";

import { sessionQueryOptions } from "../SessionContext.tsx";
import { PlantzLogo } from "./PlantzLogo.tsx";

export function LoginPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                setError("Invalid email or password.");

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
        <div className="flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_top,oklch(0.90_0.03_155/0.3),var(--background)_60%)] p-6">
            <form onSubmit={handleSubmit} className="bg-card border-border/50 w-full max-w-sm space-y-4 rounded-xl border p-8 shadow-lg">
                <div className="flex flex-col items-center gap-3">
                    <PlantzLogo className="text-foreground h-8 w-auto" />
                    <h1 className="text-foreground font-display text-2xl font-semibold tracking-tight">Log in</h1>
                </div>
                {error && (
                    <p className="text-destructive text-sm" role="alert">
                        {error}
                    </p>
                )}
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Logging in..." : "Log in"}
                </Button>
                <div className="text-muted-foreground bg-secondary/50 rounded-md p-3 text-sm">
                    <p className="mb-1 font-medium">Demo accounts:</p>
                    <ul className="space-y-1">
                        <li>
                            <code>alice@example.com</code> / <code>password</code>
                        </li>
                        <li>
                            <code>bob@example.com</code> / <code>password</code>
                        </li>
                    </ul>
                </div>
            </form>
        </div>
    );
}
