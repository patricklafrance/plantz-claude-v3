import type { Meta, StoryObj } from "@storybook/react-vite";

import { PlantzLogo } from "./PlantzLogo.tsx";

const meta = {
    title: "Packages/CoreModule/Components/PlantzLogo",
    component: PlantzLogo,
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
} satisfies Meta<typeof PlantzLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        className: "h-7 w-auto text-foreground"
    }
};

export const Large: Story = {
    args: {
        className: "h-14 w-auto text-foreground"
    }
};
