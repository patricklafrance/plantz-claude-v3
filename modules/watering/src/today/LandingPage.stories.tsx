import type { Meta, StoryObj } from "@storybook/react-vite";
import { http, HttpResponse } from "msw";
import { userEvent, waitFor, within } from "storybook/test";

import type { ResponsibilityAssignment } from "@packages/api/entities/household";
import type { Plant } from "@packages/api/entities/plants";
import { createManagementHouseholdHandlers } from "@packages/api/handlers/management";
import { createTodayPlantHandlers, createCareEventHandlers, createAssignmentHandlers } from "@packages/api/handlers/today";
import { makePlant, makeCareEvent, makeAssignment, makeHousehold, makeHouseholdMember, FAR_PAST, FAR_FUTURE } from "@packages/api/test-utils";

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

// --- Single-user stories (no household) ---

const noHouseholdHandlers = createManagementHouseholdHandlers({
    household: null,
    members: [],
    invitations: []
});

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
                ...createCareEventHandlers("empty"),
                ...noHouseholdHandlers
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
                ...createCareEventHandlers("empty"),
                ...noHouseholdHandlers
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
                ...createCareEventHandlers("empty"),
                ...noHouseholdHandlers
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
                ...createCareEventHandlers("empty"),
                ...noHouseholdHandlers
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
                ]),
                ...noHouseholdHandlers
            ]
        }
    }
};

export const Empty: Story = {
    parameters: {
        msw: {
            handlers: [...createTodayPlantHandlers([]), ...createCareEventHandlers("empty"), ...noHouseholdHandlers]
        }
    }
};

export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [...createTodayPlantHandlers("loading"), ...createCareEventHandlers("empty"), ...noHouseholdHandlers]
        }
    }
};

// --- Shared household view stories ---

const sharedHousehold = makeHousehold({ id: "household-1", name: "Green Thumb Family" });
const sharedMembers = [
    makeHouseholdMember({ id: "member-1", userId: "user-alice", role: "owner", householdId: "household-1" }),
    makeHouseholdMember({ id: "member-2", userId: "user-bob", role: "member", householdId: "household-1" })
];
// Add userName to members for storybook
const sharedMembersWithNames = sharedMembers.map(m => Object.assign({}, m, { userName: m.userId === "user-alice" ? "Alice" : "Bob" }));

const householdHandlers = createManagementHouseholdHandlers({
    household: sharedHousehold,
    members: sharedMembersWithNames,
    invitations: []
});

const sharedPlants = [
    makePlant({ id: "shared-1", name: "Aloe Vera", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "shared-2", name: "Boston Fern", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "shared-3", name: "Calathea", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "shared-4", name: "Dracaena", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "shared-5", name: "English Ivy", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "shared-6", name: "Fern", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" })
];

const sharedAssignments = [
    makeAssignment({ id: "a-1", plantId: "shared-1", assignedUserId: "user-alice", assignedUserName: "Alice" }),
    makeAssignment({ id: "a-2", plantId: "shared-2", assignedUserId: "user-alice", assignedUserName: "Alice" }),
    makeAssignment({ id: "a-3", plantId: "shared-3", assignedUserId: "user-bob", assignedUserName: "Bob" }),
    makeAssignment({ id: "a-4", plantId: "shared-4", assignedUserId: "user-bob", assignedUserName: "Bob" })
    // shared-5 and shared-6 are unassigned (no assignment record)
];

// The session user is "user-alice" (from fireflyDecorator)
// My tasks: shared-1, shared-2 (assigned to alice)
// Others' tasks: shared-3, shared-4 (assigned to bob)
// Available: shared-5, shared-6 (no assignment)
export const SharedViewDefault: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers(sharedPlants, { assignments: sharedAssignments }),
                ...createCareEventHandlers("empty"),
                ...createAssignmentHandlers(sharedAssignments),
                ...householdHandlers
            ]
        }
    }
};

// All plants assigned to Bob -- alice sees empty "My tasks"
const allBobAssignments = sharedPlants.map((p, i) =>
    makeAssignment({ id: `a-bob-${i}`, plantId: p.id, assignedUserId: "user-bob", assignedUserName: "Bob" })
);

export const SharedViewAllAssignedToOthers: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers(sharedPlants, { assignments: allBobAssignments }),
                ...createCareEventHandlers("empty"),
                ...createAssignmentHandlers(allBobAssignments),
                ...householdHandlers
            ]
        }
    }
};

// No plants due -- household mode with no due plants
export const SharedViewNoDue: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers([
                    makePlant({ id: "future-1", name: "Monstera", nextWateringDate: FAR_FUTURE, isShared: true, householdId: "household-1" }),
                    makePlant({ id: "future-2", name: "Pothos", nextWateringDate: FAR_FUTURE, isShared: true, householdId: "household-1" })
                ]),
                ...createCareEventHandlers("empty"),
                ...createAssignmentHandlers("empty"),
                ...householdHandlers
            ]
        }
    }
};

// Mixed: some assigned to self, some to others, some unassigned, with varying states
const mixedPlants = [
    makePlant({ id: "mix-1", name: "Aloe Vera", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "mix-2", name: "Boston Fern", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "mix-3", name: "Calathea", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "mix-4", name: "Dracaena", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "mix-5", name: "English Ivy", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" })
];

const mixedAssignments = [
    makeAssignment({ id: "ma-1", plantId: "mix-1", assignedUserId: "user-alice", assignedUserName: "Alice" }),
    makeAssignment({ id: "ma-2", plantId: "mix-2", assignedUserId: "user-bob", assignedUserName: "Bob" }),
    makeAssignment({ id: "ma-3", plantId: "mix-3", assignedUserId: null, assignedUserName: null })
    // mix-4, mix-5 have no assignment record
];

export const SharedViewMixedAssignmentStates: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createTodayPlantHandlers(mixedPlants, { assignments: mixedAssignments }),
                ...createCareEventHandlers([
                    makeCareEvent({ id: "ce-mix-1", plantId: "mix-1", actorId: "user-bob", actorName: "Bob", timestamp: FIXED_TIMESTAMP })
                ]),
                ...createAssignmentHandlers(mixedAssignments),
                ...householdHandlers
            ]
        }
    }
};

// --- Interactive play function stories ---

// Helper: creates MSW handlers where plant GET and assignment mutations share mutable state
function createStatefulHandlers(plants: Plant[], initialAssignments: ResponsibilityAssignment[]) {
    const assignmentStore = [...initialAssignments];

    const plantsHandler = http.get("/api/today/plants", () => {
        const assignmentMap = new Map(assignmentStore.map(a => [a.plantId, a]));
        const plantsWithAssignments = plants.map(plant => Object.assign({}, plant, { assignment: assignmentMap.get(plant.id) ?? null }));

        return HttpResponse.json(plantsWithAssignments);
    });

    const plantPutHandler = http.put("/api/today/plants/:id", () => HttpResponse.json({}, { status: 200 }));
    const plantDeleteHandler = http.delete("/api/today/plants/:id", () => new HttpResponse(null, { status: 204 }));

    const assignmentPostHandler = http.post("/api/today/assignments", async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        const assignment: ResponsibilityAssignment = {
            id: crypto.randomUUID(),
            plantId: body.plantId as string,
            householdId: body.householdId as string,
            assignedUserId: body.assignedUserId as string | null,
            assignedUserName: body.assignedUserName as string | null
        };

        assignmentStore.push(assignment);

        return HttpResponse.json(assignment, { status: 201 });
    });

    const assignmentPutHandler = http.put("/api/today/assignments/:id", async ({ params, request }) => {
        const { id } = params;
        const body = (await request.json()) as Record<string, unknown>;
        const index = assignmentStore.findIndex(a => a.id === id);

        if (index === -1) {
            return new HttpResponse(null, { status: 404 });
        }

        assignmentStore[index] = { ...assignmentStore[index]!, ...body } as ResponsibilityAssignment;

        return HttpResponse.json(assignmentStore[index]);
    });

    const assignmentDeleteHandler = http.delete("/api/today/assignments/:id", ({ params }) => {
        const { id } = params;
        const index = assignmentStore.findIndex(a => a.id === id);

        if (index === -1) {
            return new HttpResponse(null, { status: 404 });
        }

        assignmentStore.splice(index, 1);

        return new HttpResponse(null, { status: 204 });
    });

    const assignmentGetHandler = http.get("/api/today/assignments", ({ request }) => {
        const url = new URL(request.url);
        const householdId = url.searchParams.get("householdId");

        if (!householdId) {
            return HttpResponse.json([]);
        }

        return HttpResponse.json(assignmentStore.filter(a => a.householdId === householdId));
    });

    return [
        plantsHandler,
        plantPutHandler,
        plantDeleteHandler,
        assignmentGetHandler,
        assignmentPostHandler,
        assignmentPutHandler,
        assignmentDeleteHandler
    ];
}

// Interactive: Selecting a household member from the assignment control assigns responsibility
// and the task moves to "My tasks" section
const assignPlants = [
    makePlant({ id: "assign-1", name: "Aloe Vera", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "assign-2", name: "Boston Fern", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" })
];

// assign-1 unassigned (in Available), assign-2 unassigned (in Available)
export const AssignTask: Story = {
    parameters: {
        msw: {
            handlers: [...createStatefulHandlers(assignPlants, []), ...createCareEventHandlers("empty"), ...householdHandlers]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(document.body);

        // Wait for the Available section to render with the plant
        const availableSection = await canvas.findByRole("list", { name: "Available" });

        // Verify Aloe Vera starts in Available
        const aloeItem = within(availableSection);
        aloeItem.getByText("Aloe Vera");

        // Find the assign trigger for Aloe Vera
        const assignTrigger = await canvas.findByLabelText("Assign Aloe Vera");
        await userEvent.click(assignTrigger);

        // Select "Alice" from the portal dropdown
        const aliceOption = await body.findByRole("option", { name: "Alice" });
        await userEvent.click(aliceOption);

        // After mutation + re-fetch, Aloe Vera should appear in "My tasks"
        const myTasksSection = await canvas.findByRole("list", { name: "My tasks" });
        await within(myTasksSection).findByText("Aloe Vera");
    }
};

// Interactive: After assigning a task to another member, it appears under that member's section
const reassignPlants = [makePlant({ id: "reassign-1", name: "Calathea", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" })];

const reassignInitialAssignments = [makeAssignment({ id: "ra-1", plantId: "reassign-1", assignedUserId: "user-bob", assignedUserName: "Bob" })];

export const ReassignTask: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createStatefulHandlers(reassignPlants, reassignInitialAssignments),
                ...createCareEventHandlers("empty"),
                ...householdHandlers
            ]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(document.body);

        // Wait for the Others' tasks section to render with the plant
        const othersSection = await canvas.findByRole("list", { name: "Others' tasks" });
        within(othersSection).getByText("Calathea");

        // Find the assign trigger for Calathea
        const assignTrigger = await canvas.findByLabelText("Assign Calathea");
        await userEvent.click(assignTrigger);

        // Select "Alice" (current user) from the portal dropdown
        const aliceOption = await body.findByRole("option", { name: "Alice" });
        await userEvent.click(aliceOption);

        // After mutation + re-fetch, Calathea should appear in "My tasks"
        const myTasksSection = await canvas.findByRole("list", { name: "My tasks" });
        await within(myTasksSection).findByText("Calathea");
    }
};

// Interactive: Clearing an assignment moves the task to the Available section
const clearPlants = [makePlant({ id: "clear-1", name: "Dracaena", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" })];

const clearInitialAssignments = [makeAssignment({ id: "ca-1", plantId: "clear-1", assignedUserId: "user-alice", assignedUserName: "Alice" })];

export const ClearAssignment: Story = {
    parameters: {
        msw: {
            handlers: [...createStatefulHandlers(clearPlants, clearInitialAssignments), ...createCareEventHandlers("empty"), ...householdHandlers]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(document.body);

        // Wait for the My tasks section to render with the plant
        const myTasksSection = await canvas.findByRole("list", { name: "My tasks" });
        within(myTasksSection).getByText("Dracaena");

        // Find the assign trigger for Dracaena
        const assignTrigger = await canvas.findByLabelText("Assign Dracaena");
        await userEvent.click(assignTrigger);

        // Select "Unassigned" from the portal dropdown
        const unassignedOption = await body.findByRole("option", { name: "Unassigned" });
        await userEvent.click(unassignedOption);

        // After mutation + re-fetch, Dracaena should appear in "Available"
        const availableSection = await canvas.findByRole("list", { name: "Available" });
        await within(availableSection).findByText("Dracaena");
    }
};

// Interactive: The user can mark any shared plant as watered regardless of assignment,
// and the plant is removed from the due list
const waterPlants = [
    makePlant({ id: "water-1", name: "English Ivy", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" }),
    makePlant({ id: "water-2", name: "Fern", nextWateringDate: FAR_PAST, isShared: true, householdId: "household-1" })
];

const waterInitialAssignments = [
    makeAssignment({ id: "wa-1", plantId: "water-1", assignedUserId: "user-bob", assignedUserName: "Bob" }),
    makeAssignment({ id: "wa-2", plantId: "water-2", assignedUserId: "user-alice", assignedUserName: "Alice" })
];

export const MarkWateredSharedPlant: Story = {
    parameters: {
        msw: {
            handlers: [
                // Override the plants PUT to also remove the plant from the GET response
                ...createStatefulWateringHandlers(waterPlants, waterInitialAssignments),
                ...createCareEventHandlers("empty"),
                ...householdHandlers
            ]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Wait for the Others' tasks section to render with the plant assigned to Bob
        const othersSection = await canvas.findByRole("list", { name: "Others' tasks" });
        within(othersSection).getByText("English Ivy");

        // Click on the plant row to open detail dialog
        const viewButton = canvas.getByRole("button", { name: "View English Ivy" });
        await userEvent.click(viewButton);

        // In the dialog (portal), click "Mark as watered"
        const body = within(document.body);
        const markWateredButton = await body.findByRole("button", { name: /mark as watered/i });
        await userEvent.click(markWateredButton);

        // After mutation + re-fetch, English Ivy should no longer appear and Fern should remain
        await waitFor(() => {
            const myTasksSection = canvas.getByRole("list", { name: "My tasks" });
            within(myTasksSection).getByText("Fern");

            // English Ivy should be gone from the page
            const othersAfter = canvas.queryByText("English Ivy");
            if (othersAfter) {
                throw new Error("English Ivy should have been removed from the list after watering");
            }
        });
    }
};

// Helper: creates stateful handlers where marking a plant as watered removes it from the GET response
function createStatefulWateringHandlers(plants: Plant[], initialAssignments: ResponsibilityAssignment[]) {
    const assignmentStore = [...initialAssignments];
    const wateredPlantIds = new Set<string>();

    const plantsHandler = http.get("/api/today/plants", () => {
        const assignmentMap = new Map(assignmentStore.map(a => [a.plantId, a]));
        const activePlants = plants
            .filter(p => !wateredPlantIds.has(p.id))
            .map(plant => Object.assign({}, plant, { assignment: assignmentMap.get(plant.id) ?? null }));

        return HttpResponse.json(activePlants);
    });

    const plantPutHandler = http.put<{ id: string }>("/api/today/plants/:id", async ({ params }) => {
        const { id } = params;

        // Mark as watered: update the plant's next watering date to the future so it's no longer due
        wateredPlantIds.add(id as string);

        return HttpResponse.json({}, { status: 200 });
    });

    const plantDeleteHandler = http.delete("/api/today/plants/:id", () => new HttpResponse(null, { status: 204 }));

    const careEventPostHandler = http.post("/api/today/care-events", () => HttpResponse.json({}, { status: 201 }));

    const assignmentGetHandler = http.get("/api/today/assignments", ({ request }) => {
        const url = new URL(request.url);
        const householdId = url.searchParams.get("householdId");

        if (!householdId) {
            return HttpResponse.json([]);
        }

        return HttpResponse.json(assignmentStore.filter(a => a.householdId === householdId));
    });

    return [plantsHandler, plantPutHandler, plantDeleteHandler, careEventPostHandler, assignmentGetHandler];
}
