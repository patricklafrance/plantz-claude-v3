import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";

import { fireflyDecorator, sessionDecorator } from "./storybook.setup.tsx";
import { UserPage } from "./UserPage.tsx";

const meta = {
    title: "Management/Account/Pages/UserPage",
    component: UserPage,
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
        },
        msw: {
            handlers: [
                http.put("/api/management/user/profile", async () => {
                    return HttpResponse.json({ id: "user-alice", name: "Alice Updated", email: "alice@example.com" });
                }),
                http.get("/api/auth/session", () => {
                    return HttpResponse.json({ id: "user-alice", name: "Alice Johnson", email: "alice@example.com" });
                })
            ]
        }
    },
    decorators: [sessionDecorator, fireflyDecorator]
} satisfies Meta<typeof UserPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
