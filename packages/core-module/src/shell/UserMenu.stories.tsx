import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { userEvent, within } from "storybook/test";

import { SessionProvider, type Session } from "../SessionContext.tsx";
import { UserMenu } from "./UserMenu.tsx";

function Wrapper({ session, children }: { session: Session | null; children: React.ReactNode }) {
    return (
        <QueryClientProvider client={new QueryClient()}>
            <MemoryRouter>
                {session ? (
                    <SessionProvider session={session}>
                        <div className="flex justify-end p-4">{children}</div>
                    </SessionProvider>
                ) : (
                    <div className="flex justify-end p-4">{children}</div>
                )}
            </MemoryRouter>
        </QueryClientProvider>
    );
}

const aliceSession: Session = { id: "user-alice", name: "Alice Johnson", email: "alice@example.com" };
const bobSession: Session = { id: "user-bob", name: "Bob", email: "bob@example.com" };

const meta = {
    title: "Packages/CoreModule/Components/UserMenu",
    component: UserMenu,
    parameters: {
        chromatic: {
            modes: {
                "light mobile": { theme: "light", viewport: 375 },
                "light desktop": { theme: "light", viewport: 1280 },
                "dark mobile": { theme: "dark", viewport: 375 },
                "dark desktop": { theme: "dark", viewport: 1280 }
            }
        }
    }
} satisfies Meta<typeof UserMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Wrapper session={aliceSession}>
            <UserMenu />
        </Wrapper>
    )
};

export const Open: Story = {
    render: () => (
        <Wrapper session={aliceSession}>
            <UserMenu />
        </Wrapper>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByLabelText("User menu");
        await userEvent.click(trigger);
    }
};

export const ShortName: Story = {
    render: () => (
        <Wrapper session={bobSession}>
            <UserMenu />
        </Wrapper>
    )
};

export const NoSession: Story = {
    render: () => (
        <Wrapper session={null}>
            <UserMenu />
        </Wrapper>
    )
};
