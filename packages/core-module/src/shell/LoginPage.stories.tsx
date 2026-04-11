import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

import { LoginPage } from "./LoginPage.tsx";

const meta = {
    title: "Packages/CoreModule/Pages/LoginPage",
    component: LoginPage,
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
                <MemoryRouter>
                    <div className="flex min-h-[600px] items-center justify-center">
                        <Story />
                    </div>
                </MemoryRouter>
            </QueryClientProvider>
        )
    ]
} satisfies Meta<typeof LoginPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
