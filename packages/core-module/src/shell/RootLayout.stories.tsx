import type { FireflyRuntime } from "@squide/firefly";
import { initializeFireflyForStorybook, withFireflyDecorator } from "@squide/firefly-storybook";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NoopLogger } from "@workleap/logging";
import { userEvent, within } from "storybook/test";

import { SessionProvider } from "../SessionContext.tsx";
import { RootLayout } from "./RootLayout.tsx";

const runtime = await initializeFireflyForStorybook({
    loggers: [new NoopLogger()],
    localModules: [
        async (rt: FireflyRuntime) => {
            rt.registerNavigationItem({
                $id: "plants",
                $label: "My Plants",
                $priority: 90,
                to: "/management/plants"
            });
            rt.registerNavigationItem({
                $id: "today",
                $label: "Today",
                $priority: 80,
                to: "/today"
            });
        }
    ]
});

const fireflyDecorator = withFireflyDecorator(runtime);

const meta = {
    title: "Packages/CoreModule/Components/RootLayout",
    component: RootLayout,
    parameters: {
        chromatic: {
            modes: {
                "light mobile": { theme: "light", viewport: 375 },
                "light tablet": { theme: "light", viewport: 768 },
                "light desktop": { theme: "light", viewport: 1280 },
                "dark mobile": { theme: "dark", viewport: 375 },
                "dark tablet": { theme: "dark", viewport: 768 },
                "dark desktop": { theme: "dark", viewport: 1280 }
            }
        }
    },
    decorators: [
        Story => (
            <QueryClientProvider client={new QueryClient()}>
                <SessionProvider session={{ id: "user-alice", name: "Alice Johnson", email: "alice@example.com" }}>
                    <Story />
                </SessionProvider>
            </QueryClientProvider>
        ),
        fireflyDecorator
    ]
} satisfies Meta<typeof RootLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMenuOpen: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByLabelText("User menu");
        await userEvent.click(trigger);
    }
};
