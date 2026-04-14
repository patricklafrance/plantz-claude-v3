import { initializeFireflyForStorybook, withFireflyDecorator } from "@squide/firefly-storybook";
import type { Decorator } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoopLogger } from "@workleap/logging";
import { useMemo, type ReactNode } from "react";

import { SessionProvider } from "@packages/core-module";

const runtime = await initializeFireflyForStorybook({
    loggers: [new NoopLogger()]
});

export const fireflyDecorator = withFireflyDecorator(runtime);

const STORYBOOK_SESSION = { id: "user-alice", name: "Alice", email: "alice@example.com" };

function QueryDecorator({ children }: { children: ReactNode }) {
    const queryClient = useMemo(
        () =>
            new QueryClient({
                defaultOptions: { queries: { retry: false, staleTime: Infinity } }
            }),
        []
    );

    return (
        <SessionProvider session={STORYBOOK_SESSION}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </SessionProvider>
    );
}

function withQueryDecorator(): Decorator {
    return story => <QueryDecorator>{story()}</QueryDecorator>;
}

export const queryDecorator = withQueryDecorator();
