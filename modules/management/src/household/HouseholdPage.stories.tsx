import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { userEvent, within } from "storybook/test";

import { createManagementHouseholdHandlers } from "@packages/api/handlers/management";
import { makeHousehold, makeHouseholdMember, makeInvitation } from "@packages/api/test-utils";

import { HouseholdPage } from "./HouseholdPage.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

const meta = {
    title: "Management/Household/Pages/HouseholdPage",
    component: HouseholdPage,
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
} satisfies Meta<typeof HouseholdPage>;

export default meta;

type Story = StoryObj<typeof meta>;

// Visual: A page displays the user's household name and a list of members
export const WithHousehold: Story = {
    parameters: {
        msw: {
            handlers: createManagementHouseholdHandlers({
                household: makeHousehold({ id: "household-1", name: "Green Thumb Family" }),
                members: [
                    makeHouseholdMember({ id: "member-1", userId: "user-alice", role: "owner" }),
                    makeHouseholdMember({ id: "member-2", userId: "user-bob", role: "member" })
                ],
                invitations: []
            })
        }
    }
};

// Visual: When the user has no household, the page displays an empty state prompting them to create one
export const EmptyState: Story = {
    parameters: {
        msw: {
            handlers: createManagementHouseholdHandlers({
                household: null,
                members: [],
                invitations: []
            })
        }
    }
};

// Visual: Pending invitations are visually distinguishable from active members
export const WithPendingInvitations: Story = {
    parameters: {
        msw: {
            handlers: createManagementHouseholdHandlers({
                household: makeHousehold({ id: "household-1", name: "Green Thumb Family" }),
                members: [
                    makeHouseholdMember({ id: "member-1", userId: "user-alice", role: "owner" }),
                    makeHouseholdMember({ id: "member-2", userId: "user-bob", role: "member" })
                ],
                invitations: [
                    makeInvitation({ id: "inv-1", email: "charlie@example.com" }),
                    makeInvitation({ id: "inv-2", email: "diana@example.com" })
                ]
            })
        }
    }
};

// Visual: The household creation form shows fields for naming the household
export const CreationForm: Story = {
    parameters: {
        msw: {
            handlers: createManagementHouseholdHandlers({
                household: null,
                members: [],
                invitations: []
            })
        }
    }
};

// Interactive: Submitting the household creation form shows a loading state
export const CreateHouseholdLoading: Story = {
    parameters: {
        msw: {
            handlers: [
                // Delayed POST handler must come first to intercept before the factory handler
                http.post("/api/management/household", async () => {
                    await delay("infinite");

                    return HttpResponse.json({}, { status: 201 });
                }),
                ...createManagementHouseholdHandlers({
                    household: null,
                    members: [],
                    invitations: []
                })
            ]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const nameInput = await canvas.findByLabelText("Household name");
        await userEvent.type(nameInput, "My New Home");

        const submitButton = canvas.getByRole("button", { name: /create household/i });
        await userEvent.click(submitButton);

        // The button should show "Creating..." while pending
        await canvas.findByText("Creating...");
    }
};

// Interactive: After household creation, the household name and member list are visible
export const AfterHouseholdCreation: Story = {
    parameters: {
        msw: {
            handlers: createManagementHouseholdHandlers({
                household: makeHousehold({ id: "household-new", name: "Freshly Created Home" }),
                members: [makeHouseholdMember({ id: "member-new", userId: "user-alice", role: "owner", householdId: "household-new" })],
                invitations: []
            })
        }
    }
};

// Interactive: Submitting the invitation form shows a loading state
export const SendInvitationLoading: Story = {
    parameters: {
        msw: {
            handlers: [
                // Delayed POST handler must come first to intercept before the factory handler
                http.post("/api/management/household/:id/invitations", async () => {
                    await delay("infinite");

                    return HttpResponse.json({}, { status: 201 });
                }),
                ...createManagementHouseholdHandlers({
                    household: makeHousehold({ id: "household-1", name: "Green Thumb Family" }),
                    members: [makeHouseholdMember({ id: "member-1", userId: "user-alice", role: "owner" })],
                    invitations: []
                })
            ]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const emailInput = await canvas.findByPlaceholderText("Enter email address");
        await userEvent.type(emailInput, "newmember@example.com");

        const inviteButton = canvas.getByRole("button", { name: /invite/i });
        await userEvent.click(inviteButton);

        // The button should show "Sending..." while pending
        await canvas.findByText("Sending...");
    }
};

// Interactive: After sending an invitation, the invited email appears in the pending invitations area
export const AfterInvitationSent: Story = {
    parameters: {
        msw: {
            handlers: createManagementHouseholdHandlers({
                household: makeHousehold({ id: "household-1", name: "Green Thumb Family" }),
                members: [makeHouseholdMember({ id: "member-1", userId: "user-alice", role: "owner" })],
                invitations: [makeInvitation({ id: "inv-1", email: "newmember@example.com" })]
            })
        }
    }
};

// Loading state
export const Loading: Story = {
    parameters: {
        msw: { handlers: createManagementHouseholdHandlers("loading") }
    }
};

// Error state
export const Error: Story = {
    parameters: {
        msw: { handlers: createManagementHouseholdHandlers("error") }
    }
};
