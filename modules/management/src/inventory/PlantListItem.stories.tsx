import type { Meta, StoryObj } from "@storybook/react-vite";

import { makePlant, FAR_PAST, FAR_FUTURE } from "@packages/api/test-utils";

import { PlantListItem } from "./PlantListItem.tsx";

const meta = {
    title: "Management/Inventory/Components/PlantListItem",
    component: PlantListItem,
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
            id: "plant-1",
            name: "Monstera Deliciosa",
            nextWateringDate: FAR_FUTURE
        })
    }
};

export const DueForWatering: Story = {
    args: {
        plant: makePlant({
            id: "plant-2",
            name: "Monstera Deliciosa",
            nextWateringDate: FAR_PAST
        })
    }
};

export const SharedWithHousehold: Story = {
    args: {
        plant: makePlant({
            id: "plant-3",
            name: "Monstera Deliciosa",
            householdId: "household-1",
            nextWateringDate: FAR_FUTURE
        })
    }
};

export const NotShared: Story = {
    args: {
        plant: makePlant({
            id: "plant-4",
            name: "Monstera Deliciosa",
            nextWateringDate: FAR_FUTURE
        })
    }
};

export const SharedAndDue: Story = {
    args: {
        plant: makePlant({
            id: "plant-5",
            name: "Monstera Deliciosa",
            householdId: "household-1",
            nextWateringDate: FAR_PAST
        })
    }
};

export const WithSelection: Story = {
    args: {
        plant: makePlant({
            id: "plant-6",
            name: "Monstera Deliciosa",
            nextWateringDate: FAR_FUTURE
        }),
        selected: false,
        onToggleSelect: () => {}
    }
};

export const Selected: Story = {
    args: {
        plant: makePlant({
            id: "plant-7",
            name: "Monstera Deliciosa",
            nextWateringDate: FAR_FUTURE
        }),
        selected: true,
        onToggleSelect: () => {}
    }
};

export const LongName: Story = {
    args: {
        plant: makePlant({
            id: "plant-8",
            name: "Philodendron Birkin Variegated Extra Special Limited Edition Tropical Houseplant",
            nextWateringDate: FAR_FUTURE
        })
    }
};
