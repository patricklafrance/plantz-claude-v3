import type { Meta, StoryObj } from "@storybook/react-vite";

import { makePlant, FAR_PAST, FAR_FUTURE } from "@packages/api/test-utils";

import { PlantListItem } from "./PlantListItem.tsx";

const meta = {
    title: "Watering/Today/Components/PlantListItem",
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
        onClick: () => {},
        onToggleSelect: () => {}
    }
} satisfies Meta<typeof PlantListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        plant: makePlant({ id: "plant-1", name: "Monstera Deliciosa", nextWateringDate: FAR_FUTURE })
    }
};

export const DueForWatering: Story = {
    args: {
        plant: makePlant({ id: "plant-2", name: "Boston Fern", nextWateringDate: FAR_PAST })
    }
};

export const WithLastCareEvent: Story = {
    args: {
        plant: makePlant({
            id: "plant-3",
            name: "Snake Plant",
            nextWateringDate: FAR_FUTURE,
            lastCareEvent: { actorName: "Alice", performedDate: new Date(2025, 0, 1) }
        })
    }
};

export const DueWithLastCareEvent: Story = {
    args: {
        plant: makePlant({
            id: "plant-4",
            name: "Pothos",
            nextWateringDate: FAR_PAST,
            lastCareEvent: { actorName: "Bob", performedDate: new Date(2025, 0, 1) }
        })
    }
};

export const NoLastCareEvent: Story = {
    args: {
        plant: makePlant({ id: "plant-5", name: "Peace Lily", nextWateringDate: FAR_FUTURE })
    }
};

// Shared plant with household indicator
export const SharedPlant: Story = {
    args: {
        plant: makePlant({
            id: "shared-1",
            name: "Shared Monstera",
            nextWateringDate: FAR_PAST,
            householdId: "household-1"
        })
    }
};

// Shared plant showing who last watered it and when
export const SharedWithCareEvent: Story = {
    args: {
        plant: makePlant({
            id: "shared-2",
            name: "Shared Fiddle Leaf",
            nextWateringDate: FAR_PAST,
            householdId: "household-1",
            lastCareEvent: { actorName: "Bob", performedDate: new Date(Date.now() - 2 * 60 * 60 * 1000) }
        })
    }
};

// Shared plant recently watered by another member (de-emphasized)
export const SharedRecentlyWateredByOther: Story = {
    args: {
        plant: makePlant({
            id: "shared-3",
            name: "Shared Snake Plant",
            nextWateringDate: FAR_PAST,
            householdId: "household-1",
            userId: "user-bob",
            lastCareEvent: { actorName: "Bob", performedDate: new Date(Date.now() - 1 * 60 * 60 * 1000) }
        }),
        currentUserId: "user-alice"
    }
};

// Personal plant (no householdId) -- no shared indicator
export const PersonalPlant: Story = {
    args: {
        plant: makePlant({
            id: "personal-1",
            name: "My Personal Cactus",
            nextWateringDate: FAR_PAST
        })
    }
};
