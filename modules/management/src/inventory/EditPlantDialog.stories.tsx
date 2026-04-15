import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";

import { createHouseholdHandlers } from "@packages/api/handlers/household";
import { createManagementPlantHandlers } from "@packages/api/handlers/management";
import { makePlant, FAR_PAST, FAR_FUTURE } from "@packages/api/test-utils";

import { EditPlantDialog } from "./EditPlantDialog.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

const testHousehold = {
    household: { id: "household-1", name: "Green Thumbs", createdByUserId: "user-alice", creationDate: new Date("2025-01-01") },
    members: [{ householdId: "household-1", userId: "user-alice", userName: "Alice", role: "owner" as const, joinedDate: new Date("2025-01-01") }]
};

const editPlants = [
    makePlant({ id: "test-edit-1", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-2", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-3", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-4", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-5", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-6", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-7", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-8", name: "Monstera Deliciosa", householdId: "household-1" })
];

const meta = {
    title: "Management/Inventory/Components/EditPlantDialog",
    component: EditPlantDialog,
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
        msw: {
            handlers: [...createManagementPlantHandlers(editPlants), ...createHouseholdHandlers(testHousehold)]
        }
    },
    args: {
        open: true,
        onOpenChange: () => {},
        onDelete: () => {}
    }
} satisfies Meta<typeof EditPlantDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithPlant: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-1",
            name: "Monstera Deliciosa",
            description: "A tropical plant with large fenestrated leaves",
            family: "Araceae",
            soilType: "Well-draining mix",
            nextWateringDate: FAR_FUTURE
        })
    }
};

export const MinimalPlant: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-2",
            name: "Monstera Deliciosa"
        })
    }
};

export const AllOptionalFieldsFilled: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-3",
            name: "Monstera Deliciosa",
            description: "Beautiful tropical plant known for its distinctive split leaves and aerial roots. Thrives in indirect light.",
            family: "Araceae",
            soilType: "Peat moss, perlite, and orchid bark mix"
        })
    }
};

export const DueForWatering: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-4",
            name: "Monstera Deliciosa",
            nextWateringDate: FAR_PAST
        })
    }
};

export const MistLeavesFalse: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-5",
            name: "Monstera Deliciosa",
            mistLeaves: false
        })
    }
};

export const LongFieldValues: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-6",
            name: "Philodendron Birkin Variegated Extra Special Limited Edition Tropical Houseplant Collection Premium Series",
            description:
                "This is an exceptionally rare and beautiful tropical plant that has been carefully cultivated over many generations. Known for its distinctive pinstripe variegation patterns on dark green leaves, it thrives in indirect light conditions and requires consistent moisture without overwatering. Originally native to the tropical forests of South America.",
            family: "Araceae (Philodendron subfamily)",
            soilType: "Premium organic peat moss mixed with perlite, vermiculite, and orchid bark in equal parts",
            wateringQuantity: "250ml slowly poured around the base every 5-7 days"
        })
    }
};

export const WithMarkWatered: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-1",
            name: "Monstera Deliciosa",
            description: "A tropical plant with large fenestrated leaves",
            nextWateringDate: FAR_PAST
        }),
        onMarkWatered: () => {}
    }
};

export const NullPlant: Story = {
    args: {
        plant: null
    }
};

export const Closed: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-1",
            name: "Monstera Deliciosa"
        }),
        open: false
    }
};

export const WithHousehold: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-7",
            name: "Monstera Deliciosa"
        })
    },
    parameters: {
        msw: {
            handlers: [...createManagementPlantHandlers(editPlants), ...createHouseholdHandlers(testHousehold)]
        }
    }
};

export const NoHousehold: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-7",
            name: "Monstera Deliciosa"
        })
    },
    parameters: {
        msw: {
            handlers: [...createManagementPlantHandlers(editPlants), ...createHouseholdHandlers({ household: null, members: [] })]
        }
    }
};

export const SharingEnabled: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-8",
            name: "Monstera Deliciosa",
            householdId: "household-1"
        }),
        _defaultSharing: true
    },
    parameters: {
        msw: {
            handlers: [...createManagementPlantHandlers(editPlants), ...createHouseholdHandlers(testHousehold)]
        }
    }
};

export const ToggleSharingOn: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-7",
            name: "Monstera Deliciosa"
        })
    },
    parameters: {
        msw: {
            handlers: [...createManagementPlantHandlers(editPlants), ...createHouseholdHandlers(testHousehold)]
        }
    },
    play: async ({ canvasElement }) => {
        const doc = within(canvasElement.ownerDocument.body);
        const toggle = await doc.findByRole("switch", { name: "Share with household" });
        await userEvent.click(toggle);
    }
};

export const ToggleSharingOff: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-8",
            name: "Monstera Deliciosa",
            householdId: "household-1"
        }),
        _defaultSharing: true
    },
    parameters: {
        msw: {
            handlers: [...createManagementPlantHandlers(editPlants), ...createHouseholdHandlers(testHousehold)]
        }
    },
    play: async ({ canvasElement }) => {
        const doc = within(canvasElement.ownerDocument.body);
        const toggle = await doc.findByRole("switch", { name: "Share with household" });
        await userEvent.click(toggle);
    }
};

export const SharingToggleSaved: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-7",
            name: "Monstera Deliciosa"
        })
    },
    parameters: {
        msw: {
            handlers: [...createManagementPlantHandlers(editPlants), ...createHouseholdHandlers(testHousehold)]
        }
    },
    play: async ({ canvasElement }) => {
        const doc = within(canvasElement.ownerDocument.body);
        const toggle = await doc.findByRole("switch", { name: "Share with household" });
        await userEvent.click(toggle);
        await doc.findByText("Saved");
    }
};
