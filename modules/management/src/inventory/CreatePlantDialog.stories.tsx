import type { Meta, StoryObj } from "@storybook/react-vite";

import { managementPlantHandlers } from "@packages/api/handlers/management";

import { CreatePlantDialog } from "./CreatePlantDialog.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

// Fixed date for deterministic Chromatic snapshots — passed as a prop so the
// DatePicker always displays the same value regardless of when the snapshot runs.
const FIXED_FIRST_WATERING_DATE = new Date(2026, 2, 11, 0, 0, 0, 0);

const meta = {
    title: "Management/Inventory/Components/CreatePlantDialog",
    component: CreatePlantDialog,
    decorators: [queryDecorator, fireflyDecorator],
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
        msw: { handlers: managementPlantHandlers }
    },
    args: {
        open: true,
        onOpenChange: () => {},
        defaultFirstWateringDate: FIXED_FIRST_WATERING_DATE
    }
} satisfies Meta<typeof CreatePlantDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const Closed: Story = {
    args: {
        open: false
    }
};
