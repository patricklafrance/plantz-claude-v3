import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { createTodayPlantHandlers } from "@packages/api/handlers/today";
import { makePlant, FAR_PAST, FAR_FUTURE } from "@packages/api/test-utils";

import { LandingPage } from "./LandingPage.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

const meta = {
    title: "Watering/Today/Pages/LandingPage",
    component: LandingPage,
    decorators: [queryDecorator, fireflyDecorator],
    beforeEach: () => {
        sessionStorage.setItem("plantz-auth-token", "user-alice");

        return () => {
            sessionStorage.removeItem("plantz-auth-token");
        };
    },
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
            handlers: createTodayPlantHandlers([
                makePlant({ id: "due-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-2", name: "Boston Fern", nextWateringDate: FAR_PAST }),
                makePlant({ id: "not-due-1", name: "Cactus", nextWateringDate: FAR_FUTURE }),
                makePlant({ id: "due-3", name: "Dracaena", nextWateringDate: FAR_PAST }),
                makePlant({ id: "not-due-2", name: "Echeveria", nextWateringDate: FAR_FUTURE })
            ])
        }
    }
};

// All plants have future watering dates -- none are due
export const NoPlantsDue: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({ id: "future-1", name: "Monstera", nextWateringDate: FAR_FUTURE }),
                makePlant({ id: "future-2", name: "Pothos", nextWateringDate: FAR_FUTURE }),
                makePlant({ id: "future-3", name: "Snake Plant", nextWateringDate: FAR_FUTURE })
            ])
        }
    }
};

// All plants have past watering dates -- all are due
export const AllDueForWatering: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({ id: "due-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-2", name: "Boston Fern", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-3", name: "Calathea", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-4", name: "Dracaena", nextWateringDate: FAR_PAST }),
                makePlant({ id: "due-5", name: "English Ivy", nextWateringDate: FAR_PAST })
            ])
        }
    }
};

export const SinglePlant: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({
                    id: "single-1",
                    name: "Monstera Deliciosa",
                    description: "A tropical plant with large fenestrated leaves.",
                    family: "Araceae",
                    nextWateringDate: FAR_PAST
                })
            ])
        }
    }
};

export const Empty: Story = {
    parameters: {
        msw: { handlers: createTodayPlantHandlers([]) }
    }
};

export const Loading: Story = {
    parameters: {
        msw: { handlers: createTodayPlantHandlers("loading") }
    }
};

// Mix of personal and shared household plants
export const WithSharedPlants: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({ id: "personal-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                makePlant({ id: "personal-2", name: "Boston Fern", nextWateringDate: FAR_PAST }),
                makePlant({
                    id: "shared-1",
                    name: "Shared Monstera",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    assignedUserId: "user-alice",
                    lastCareEvent: { actorName: "Bob", performedDate: new Date(Date.now() - 1 * 60 * 60 * 1000) }
                }),
                makePlant({
                    id: "shared-2",
                    name: "Shared Fiddle Leaf",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    assignedUserId: "user-bob"
                }),
                makePlant({
                    id: "shared-3",
                    name: "Shared Snake Plant",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1"
                    // No assignedUserId -- unassigned
                })
            ])
        }
    }
};

// Shared plant recently watered by another member -- de-emphasized
export const SharedRecentlyWatered: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({ id: "personal-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                makePlant({
                    id: "shared-1",
                    name: "Shared Monstera",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    userId: "user-bob",
                    lastCareEvent: { actorName: "Bob", performedDate: new Date(Date.now() - 30 * 60 * 1000) }
                }),
                makePlant({
                    id: "shared-2",
                    name: "Shared Fiddle Leaf",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1"
                })
            ])
        }
    }
};

// Interactive: Selecting "My tasks" filter
export const FilterMyTasks: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({ id: "personal-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                makePlant({
                    id: "shared-1",
                    name: "Shared Monstera",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    assignedUserId: "user-alice"
                }),
                makePlant({
                    id: "shared-2",
                    name: "Shared Fiddle Leaf",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    assignedUserId: "user-bob"
                }),
                makePlant({
                    id: "shared-3",
                    name: "Shared Unassigned",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1"
                })
            ])
        }
    },
    play: async ({ canvasElement }) => {
        const body = canvasElement.ownerDocument.body;
        const canvas = within(body);

        // Wait for plants to load
        await canvas.findByText("Aloe Vera");

        // Open the filter popover
        const filterButton = await canvas.findByRole("button", { name: /filters/i });
        await userEvent.click(filterButton);

        // Select "My tasks" from the assignment filter
        const assignmentSelect = await canvas.findByLabelText("filter-assignment");
        await userEvent.click(assignmentSelect);

        const myTasksOption = await canvas.findByRole("option", { name: "My tasks" });
        await userEvent.click(myTasksOption);

        // Verify the "My tasks" chip appears (use the remove button's unique aria-label to avoid matching the select trigger)
        await expect(await canvas.findByRole("button", { name: "Remove My tasks filter" })).toBeInTheDocument();
    }
};

// Interactive: Selecting "Others' tasks" filter
export const FilterOthersTasks: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({ id: "personal-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                makePlant({
                    id: "shared-1",
                    name: "Shared Monstera",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    assignedUserId: "user-alice"
                }),
                makePlant({
                    id: "shared-2",
                    name: "Shared Fiddle Leaf",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    assignedUserId: "user-bob"
                })
            ])
        }
    },
    play: async ({ canvasElement }) => {
        const body = canvasElement.ownerDocument.body;
        const canvas = within(body);

        // Wait for plants to load
        await canvas.findByText("Aloe Vera");

        // Open the filter popover
        const filterButton = await canvas.findByRole("button", { name: /filters/i });
        await userEvent.click(filterButton);

        // Select "Others' tasks" from the assignment filter
        const assignmentSelect = await canvas.findByLabelText("filter-assignment");
        await userEvent.click(assignmentSelect);

        const othersOption = await canvas.findByRole("option", { name: "Others' tasks" });
        await userEvent.click(othersOption);

        // Verify the "Others' tasks" chip appears (use the remove button's unique aria-label to avoid matching the select trigger)
        await expect(await canvas.findByRole("button", { name: "Remove Others' tasks filter" })).toBeInTheDocument();
    }
};

// Interactive: Clearing the assignment filter restores full list
export const FilterClearAssignment: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({ id: "personal-1", name: "Aloe Vera", nextWateringDate: FAR_PAST }),
                makePlant({
                    id: "shared-1",
                    name: "Shared Monstera",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    assignedUserId: "user-bob"
                })
            ])
        }
    },
    play: async ({ canvasElement }) => {
        const body = canvasElement.ownerDocument.body;
        const canvas = within(body);

        // Wait for plants to load
        await canvas.findByText("Aloe Vera");

        // Open the filter popover and set a filter
        const filterButton = await canvas.findByRole("button", { name: /filters/i });
        await userEvent.click(filterButton);

        const assignmentSelect = await canvas.findByLabelText("filter-assignment");
        await userEvent.click(assignmentSelect);

        const othersOption = await canvas.findByRole("option", { name: "Others' tasks" });
        await userEvent.click(othersOption);

        // Now clear all filters
        const clearButton = await canvas.findByRole("button", { name: /clear all/i });
        await userEvent.click(clearButton);

        // Verify all plants are back
        await expect(await canvas.findByText("2 plants due for watering")).toBeInTheDocument();
    }
};

// Interactive: Mark shared plant as watered updates care activity display
export const MarkSharedPlantWatered: Story = {
    parameters: {
        msw: {
            handlers: createTodayPlantHandlers([
                makePlant({
                    id: "shared-1",
                    name: "Shared Monstera",
                    nextWateringDate: FAR_PAST,
                    householdId: "household-1",
                    assignedUserId: "user-alice"
                })
            ])
        }
    }
};
