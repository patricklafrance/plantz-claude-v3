import { createContext, useContext, type ReactNode } from "react";

import { AuthError } from "./AuthError.ts";

export interface Session {
    id: string;
    name: string;
    email: string;
}

export function sessionQueryOptions() {
    return {
        queryKey: ["/api/auth/session"],
        retry: false,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        queryFn: async () => {
            const res = await fetch("/api/auth/session");

            if (!res.ok) {
                throw new AuthError(res.status);
            }

            return (await res.json()) as Session;
        }
    };
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ session, children }: { session: Session; children: ReactNode }) {
    return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession(): Session | null {
    return useContext(SessionContext);
}
