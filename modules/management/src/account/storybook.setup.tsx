import { initializeFireflyForStorybook, withFireflyDecorator } from "@squide/firefly-storybook";
import type { Decorator } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoopLogger } from "@workleap/logging";

import { SessionProvider } from "@packages/core-module";

const runtime = await initializeFireflyForStorybook({
    loggers: [new NoopLogger()]
});

export const fireflyDecorator = withFireflyDecorator(runtime);

export const sessionDecorator: Decorator = Story => (
    <QueryClientProvider client={new QueryClient()}>
        <SessionProvider session={{ id: "user-alice", name: "Alice Johnson", email: "alice@example.com" }}>
            <Story />
        </SessionProvider>
    </QueryClientProvider>
);
