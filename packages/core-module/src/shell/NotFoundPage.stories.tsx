import type { Meta, StoryObj } from "@storybook/react-vite";

import { NotFoundPage } from "./NotFoundPage.tsx";

const meta = {
    title: "Packages/CoreModule/Pages/NotFoundPage",
    component: NotFoundPage,
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
} satisfies Meta<typeof NotFoundPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
