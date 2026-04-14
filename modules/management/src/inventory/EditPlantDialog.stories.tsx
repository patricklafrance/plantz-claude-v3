import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";

import { createManagementPlantHandlers, createManagementHouseholdHandlers } from "@packages/api/handlers/management";
import { makePlant, makeHousehold, FAR_PAST, FAR_FUTURE } from "@packages/api/test-utils";

import { EditPlantDialog } from "./EditPlantDialog.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

const editPlants = [
    makePlant({ id: "test-edit-1", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-2", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-3", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-4", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-5", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-6", name: "Monstera Deliciosa" }),
    makePlant({ id: "test-edit-7", name: "Monstera Deliciosa", isShared: true, householdId: "household-1" }),
    makePlant({ id: "test-edit-8", name: "Monstera Deliciosa", isShared: false }),
    makePlant({ id: "test-edit-9", name: "Monstera Deliciosa", isShared: false }),
    makePlant({ id: "test-edit-10", name: "Monstera Deliciosa", isShared: false }),
    makePlant({ id: "test-edit-11", name: "Monstera Deliciosa", isShared: true, householdId: "household-1" })
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
        msw: { handlers: createManagementPlantHandlers(editPlants) }
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

const householdHandlers = createManagementHouseholdHandlers({
    household: makeHousehold({ id: "household-1", name: "Green Thumb Family" }),
    members: [],
    invitations: []
});

export const WithSharingToggleOn: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-7",
            name: "Monstera Deliciosa",
            isShared: true,
            householdId: "household-1"
        })
    },
    parameters: {
        msw: {
            handlers: [...householdHandlers, ...createManagementPlantHandlers(editPlants)]
        }
    }
};

export const WithSharingToggleOff: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-8",
            name: "Monstera Deliciosa",
            isShared: false
        })
    },
    parameters: {
        msw: {
            handlers: [...householdHandlers, ...createManagementPlantHandlers(editPlants)]
        }
    }
};

export const NoHousehold: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-9",
            name: "Monstera Deliciosa",
            isShared: false
        })
    },
    parameters: {
        msw: {
            handlers: [
                ...createManagementHouseholdHandlers({ household: null, members: [], invitations: [] }),
                ...createManagementPlantHandlers(editPlants)
            ]
        }
    }
};

// Interactive: Toggling sharing switch to on auto-saves and shows "Saved" indicator
export const ToggleSharingOn: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-10",
            name: "Monstera Deliciosa",
            isShared: false
        })
    },
    parameters: {
        msw: {
            handlers: [...householdHandlers, ...createManagementPlantHandlers(editPlants)]
        }
    },
    play: async () => {
        // Dialog renders in a portal outside canvasElement, so query document.body
        const body = within(document.body);

        const sharingSwitch = await body.findByRole("switch", { name: /share with household/i });
        await userEvent.click(sharingSwitch);

        // Wait for the debounce+save cycle to complete and show "Saved"
        await body.findByText("Saved");
    }
};

// Interactive: Toggling sharing switch to off auto-saves and shows "Saved" indicator
export const ToggleSharingOff: Story = {
    args: {
        plant: makePlant({
            id: "test-edit-11",
            name: "Monstera Deliciosa",
            isShared: true,
            householdId: "household-1"
        })
    },
    parameters: {
        msw: {
            handlers: [...householdHandlers, ...createManagementPlantHandlers(editPlants)]
        }
    },
    play: async () => {
        // Dialog renders in a portal outside canvasElement, so query document.body
        const body = within(document.body);

        const sharingSwitch = await body.findByRole("switch", { name: /share with household/i });
        await userEvent.click(sharingSwitch);

        // Wait for the debounce+save cycle to complete and show "Saved"
        await body.findByText("Saved");
    }
};
