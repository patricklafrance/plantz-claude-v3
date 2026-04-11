import type { Meta, StoryObj } from "@storybook/react-vite";

import { createManagementPlantHandlers } from "@packages/api/handlers/management";
import { makePlant, FAR_PAST, FAR_FUTURE } from "@packages/api/test-utils";

import { PlantsPage } from "./PlantsPage.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

const meta = {
    title: "Management/Inventory/Pages/PlantsPage",
    component: PlantsPage,
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
        }
    }
} satisfies Meta<typeof PlantsPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// Representative mix: some due, some not, various locations and properties
export const Default: Story = {
    parameters: {
        msw: {
            handlers: createManagementPlantHandlers([
                makePlant({
                    id: "p-1",
                    name: "Aloe Vera",
                    family: "Asphodelaceae",
                    location: "kitchen",
                    luminosity: "high",
                    nextWateringDate: FAR_PAST
                }),
                makePlant({
                    id: "p-2",
                    name: "Boston Fern",
                    family: "Nephrolepidaceae",
                    location: "bathroom",
                    luminosity: "medium",
                    nextWateringDate: FAR_FUTURE
                }),
                makePlant({
                    id: "p-3",
                    name: "Calathea Orbifolia",
                    family: "Marantaceae",
                    location: "living-room",
                    luminosity: "low",
                    nextWateringDate: FAR_PAST
                }),
                makePlant({
                    id: "p-4",
                    name: "Dracaena Marginata",
                    family: "Asparagaceae",
                    location: "bedroom",
                    luminosity: "medium",
                    nextWateringDate: FAR_FUTURE
                }),
                makePlant({ id: "p-5", name: "English Ivy", family: "Araliaceae", location: "dining-room", nextWateringDate: FAR_PAST }),
                makePlant({
                    id: "p-6",
                    name: "Fiddle Leaf Fig",
                    family: "Moraceae",
                    location: "living-room",
                    luminosity: "high",
                    nextWateringDate: FAR_FUTURE
                }),
                makePlant({
                    id: "p-7",
                    name: "Golden Barrel Cactus",
                    family: "Cactaceae",
                    location: "basement",
                    luminosity: "high",
                    mistLeaves: false,
                    nextWateringDate: FAR_FUTURE
                }),
                makePlant({ id: "p-8", name: "Hoya Carnosa", family: "Apocynaceae", location: "bedroom", nextWateringDate: FAR_PAST }),
                makePlant({
                    id: "p-9",
                    name: "Jade Plant",
                    family: "Crassulaceae",
                    location: "kitchen",
                    luminosity: "high",
                    mistLeaves: false,
                    nextWateringDate: FAR_FUTURE
                }),
                makePlant({ id: "p-10", name: "Kentia Palm", family: "Arecaceae", location: "living-room", nextWateringDate: FAR_FUTURE })
            ])
        }
    }
};

export const Empty: Story = {
    parameters: {
        msw: { handlers: createManagementPlantHandlers([]) }
    }
};

export const SinglePlant: Story = {
    parameters: {
        msw: {
            handlers: createManagementPlantHandlers([
                makePlant({
                    id: "single-1",
                    name: "Monstera Deliciosa",
                    description: "A tropical plant with large fenestrated leaves.",
                    family: "Araceae"
                })
            ])
        }
    }
};

export const ManyDueForWatering: Story = {
    parameters: {
        msw: {
            handlers: createManagementPlantHandlers([
                makePlant({ id: "due-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-2", name: "Boston Fern", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-3", name: "Calathea Orbifolia", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-4", name: "Dracaena Marginata", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-5", name: "English Ivy", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-6", name: "Fiddle Leaf Fig", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-7", name: "Golden Barrel Cactus", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-8", name: "Hoya Carnosa", nextWateringDate: FAR_PAST })
            ])
        }
    }
};

export const Loading: Story = {
    parameters: {
        msw: { handlers: createManagementPlantHandlers("loading") }
    }
};
