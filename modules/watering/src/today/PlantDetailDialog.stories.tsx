import type { Meta, StoryObj } from "@storybook/react-vite";

import type { Plant } from "@packages/api/entities/plants";

import { PlantDetailDialog } from "./PlantDetailDialog.tsx";

const FAR_PAST = new Date(2020, 0, 1, 0, 0, 0, 0);
const FIXED_CREATION = new Date(2025, 0, 1, 0, 0, 0, 0);

function makePlant(overrides: Partial<Plant> = {}): Plant {
    return {
        id: "test-1",
        userId: "user-alice",
        name: "Monstera Deliciosa",
        description: "A tropical plant with large fenestrated leaves.",
        family: "Araceae",
        location: "living-room",
        luminosity: "medium",
        mistLeaves: true,
        soilType: "Well-draining mix",
        isShared: false,
        wateringFrequency: "1-week",
        wateringQuantity: "200ml",
        wateringType: "surface",
        nextWateringDate: FAR_PAST,
        creationDate: FIXED_CREATION,
        lastUpdateDate: FIXED_CREATION,
        ...overrides
    };
}

const meta = {
    title: "Watering/Today/Components/PlantDetailDialog",
    component: PlantDetailDialog,
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
        open: true,
        onOpenChange: () => {}
    }
} satisfies Meta<typeof PlantDetailDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        plant: makePlant()
    }
};

export const MinimalFields: Story = {
    args: {
        plant: makePlant({
            description: undefined,
            family: undefined,
            soilType: undefined
        })
    }
};

export const LongValues: Story = {
    args: {
        plant: makePlant({
            name: "Philodendron Birkin Variegated Extra Special Limited Edition",
            description:
                "A rare variegated cultivar of the Philodendron Birkin with stunning white pinstripe patterns on dark green leaves. Requires consistent humidity and indirect light.",
            wateringQuantity: "500ml every other day when soil is dry"
        })
    }
};

export const WithMarkWatered: Story = {
    args: {
        plant: makePlant(),
        onMarkWatered: () => {}
    }
};
