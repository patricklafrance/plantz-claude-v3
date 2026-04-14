import type { Meta, StoryObj } from "@storybook/react-vite";

import type { CareEvent } from "@packages/api/entities/care-events";
import type { Plant } from "@packages/api/entities/plants";

import { PlantListItem } from "./PlantListItem.tsx";

const FAR_PAST = new Date(2020, 0, 1, 0, 0, 0, 0);
const FAR_FUTURE = new Date(2099, 0, 1, 0, 0, 0, 0);
const FIXED_CREATION = new Date(2025, 0, 1, 0, 0, 0, 0);
const FIXED_TIMESTAMP = new Date(2025, 2, 15, 10, 0, 0, 0);

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
        wateringFrequency: "1-week",
        wateringQuantity: "200ml",
        wateringType: "surface",
        nextWateringDate: FAR_FUTURE,
        creationDate: FIXED_CREATION,
        lastUpdateDate: FIXED_CREATION,
        ...overrides
    };
}

function makeCareEvent(overrides: Partial<CareEvent> = {}): CareEvent {
    return {
        id: "care-1",
        plantId: "test-1",
        actorId: "user-bob",
        actorName: "Bob",
        eventType: "watered",
        timestamp: FIXED_TIMESTAMP,
        ...overrides
    };
}

const meta = {
    title: "Watering/Today/Components/PlantListItem",
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
        onClick: () => {}
    }
} satisfies Meta<typeof PlantListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        plant: makePlant()
    }
};

export const DueForWatering: Story = {
    args: {
        plant: makePlant({ nextWateringDate: FAR_PAST })
    }
};

export const WithSelection: Story = {
    args: {
        plant: makePlant(),
        onToggleSelect: () => {},
        selected: false
    }
};

export const Selected: Story = {
    args: {
        plant: makePlant(),
        onToggleSelect: () => {},
        selected: true
    }
};

export const WithCareAttribution: Story = {
    args: {
        plant: makePlant(),
        recentCareEvent: makeCareEvent()
    }
};

export const WithCareAttributionDue: Story = {
    args: {
        plant: makePlant({ nextWateringDate: FAR_PAST }),
        recentCareEvent: makeCareEvent()
    }
};
