import type { Meta, StoryObj } from "@storybook/react-vite";

import { createTodayPlantHandlers, createCareEventHandlers } from "@packages/api/handlers/today";
import { makePlant, makeCareEvent, FAR_PAST, FAR_FUTURE } from "@packages/api/test-utils";

import { LandingPage } from "./LandingPage.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

const FIXED_TIMESTAMP = new Date(2025, 2, 15, 10, 0, 0, 0);

const meta = {
    title: "Watering/Today/Pages/LandingPage",
    component: LandingPage,
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
} satisfies Meta<typeof LandingPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// Default: mix of due and not-due plants (landing page filters to due only)
export const Default: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers([
                    makePlant({ id: "due-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "due-2", name: "Boston Fern", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "not-due-1", name: "Cactus", nextWateringDate: FAR_FUTURE }),
                    makePlant({ id: "due-3", name: "Dracaena", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "not-due-2", name: "Echeveria", nextWateringDate: FAR_FUTURE })
                ]),
                ...createCareEventHandlers("empty")
            ]
        }
    }
};

// All plants have future watering dates -- none are due
export const NoPlantsDue: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers([
                    makePlant({ id: "future-1", name: "Monstera", nextWateringDate: FAR_FUTURE }),
                    makePlant({ id: "future-2", name: "Pothos", nextWateringDate: FAR_FUTURE }),
                    makePlant({ id: "future-3", name: "Snake Plant", nextWateringDate: FAR_FUTURE })
                ]),
                ...createCareEventHandlers("empty")
            ]
        }
    }
};

// All plants have past watering dates -- all are due
export const AllDueForWatering: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers([
                    makePlant({ id: "due-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "due-2", name: "Boston Fern", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "due-3", name: "Calathea", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "due-4", name: "Dracaena", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "due-5", name: "English Ivy", nextWateringDate: FAR_PAST })
                ]),
                ...createCareEventHandlers("empty")
            ]
        }
    }
};

export const SinglePlant: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers([
                    makePlant({
                        id: "single-1",
                        name: "Monstera Deliciosa",
                        description: "A tropical plant with large fenestrated leaves.",
                        family: "Araceae",
                        nextWateringDate: FAR_PAST
                    })
                ]),
                ...createCareEventHandlers("empty")
            ]
        }
    }
};

export const WithCareEventAttribution: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers([
                    makePlant({ id: "due-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "due-2", name: "Boston Fern", nextWateringDate: FAR_PAST }),
                    makePlant({ id: "due-3", name: "Dracaena", nextWateringDate: FAR_PAST })
                ]),
                ...createCareEventHandlers([
                    makeCareEvent({ id: "ce-1", plantId: "due-1", actorId: "user-bob", actorName: "Bob", timestamp: FIXED_TIMESTAMP }),
                    makeCareEvent({ id: "ce-2", plantId: "due-3", actorId: "user-bob", actorName: "Bob", timestamp: FIXED_TIMESTAMP })
                ])
            ]
        }
    }
};

export const Empty: Story = {
    parameters: {
        msw: {
            handlers: [...createTodayPlantHandlers([]), ...createCareEventHandlers("empty")]
        }
    }
};

export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [...createTodayPlantHandlers("loading"), ...createCareEventHandlers("empty")]
        }
    }
};
