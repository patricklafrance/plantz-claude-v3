import type { Meta, StoryObj } from "@storybook/react-vite";

import { makePlant, FAR_FUTURE, FAR_PAST } from "@packages/api/test-utils";

import { PlantListItem } from "./PlantListItem.tsx";

const meta = {
    title: "Management/Inventory/Components/PlantListItem",
    component: PlantListItem,
    parameters: {
        chromatic: {
            modes: {
                "light mobile": { theme: "light", viewport: 375 },
                "light desktop": { theme: "light", viewport: 1280 },
                "dark mobile": { theme: "dark", viewport: 375 },
                "dark desktop": { theme: "dark", viewport: 1280 }
            }
        }
    },
    args: {
        onEdit: () => {},
        onDelete: () => {},
        onMarkWatered: () => {}
    }
} satisfies Meta<typeof PlantListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        plant: makePlant({
            id: "test-item-1",
            name: "Monstera Deliciosa",
            nextWateringDate: FAR_FUTURE
        })
    }
};

export const DueForWatering: Story = {
    args: {
        plant: makePlant({
            id: "test-item-2",
            name: "Fiddle Leaf Fig",
            nextWateringDate: FAR_PAST
        })
    }
};

export const SharedPlant: Story = {
    args: {
        plant: makePlant({
            id: "test-item-3",
            name: "Snake Plant",
            isShared: true,
            householdId: "household-1",
            nextWateringDate: FAR_FUTURE
        })
    }
};

export const SharedAndDue: Story = {
    args: {
        plant: makePlant({
            id: "test-item-4",
            name: "Pothos",
            isShared: true,
            householdId: "household-1",
            nextWateringDate: FAR_PAST
        })
    }
};

export const NotShared: Story = {
    args: {
        plant: makePlant({
            id: "test-item-5",
            name: "Peace Lily",
            isShared: false,
            nextWateringDate: FAR_FUTURE
        })
    }
};
