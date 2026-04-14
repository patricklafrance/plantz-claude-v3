import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { expect, userEvent, within } from "storybook/test";

import { createHouseholdHandlers, createInvitationHandlers } from "@packages/api/handlers/household";
import { makeHousehold, makeHouseholdMember, makeInvitation } from "@packages/api/test-utils";

import { HouseholdPage } from "./HouseholdPage.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

const defaultHousehold = makeHousehold({ id: "h-1", name: "Green Thumbs" });
const defaultMembers = [
    makeHouseholdMember({ householdId: "h-1", userId: "user-alice", userName: "Alice", role: "owner" }),
    makeHouseholdMember({ householdId: "h-1", userId: "user-bob", userName: "Bob" })
];

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

// Default state: household with members and a pending outgoing invitation
export const Default: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createHouseholdHandlers({ household: defaultHousehold, members: defaultMembers }),
                ...createInvitationHandlers({
                    outgoing: [makeInvitation({ id: "inv-1", householdId: "h-1", inviteeEmail: "charlie@example.com" })],
                    incoming: []
                })
            ]
        }
    }
};

// No household exists — shows the create prompt
export const NoHousehold: Story = {
    parameters: {
        msw: {
            handlers: [...createHouseholdHandlers({ household: null, members: [] }), ...createInvitationHandlers({ outgoing: [], incoming: [] })]
        }
    }
};

// Loading state
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createHouseholdHandlers({ household: "loading", members: "loading" }),
                ...createInvitationHandlers({ outgoing: "loading", incoming: "loading" })
            ]
        }
    }
};

// Error state
export const Error: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createHouseholdHandlers({ household: "error", members: "error" }),
                ...createInvitationHandlers({ outgoing: "error", incoming: "error" })
            ]
        }
    }
};

// Household with no invitations (empty state)
export const NoInvitations: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createHouseholdHandlers({ household: defaultHousehold, members: defaultMembers }),
                ...createInvitationHandlers({ outgoing: [], incoming: [] })
            ]
        }
    }
};

// Incoming invitations for the current user
export const IncomingInvitations: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createHouseholdHandlers({ household: defaultHousehold, members: defaultMembers }),
                ...createInvitationHandlers({
                    outgoing: [],
                    incoming: [
                        Object.assign({}, makeInvitation({ id: "inv-in-1", householdId: "h-2", inviteeEmail: "alice@example.com" }), {
                            householdName: "Sunny Gardens"
                        }),
                        Object.assign({}, makeInvitation({ id: "inv-in-2", householdId: "h-3", inviteeEmail: "alice@example.com" }), {
                            householdName: "Herb Lovers"
                        })
                    ]
                })
            ]
        }
    }
};

// Interactive: clicking "Create Household" opens the creation form
export const CreateFormOpen: Story = {
    parameters: {
        msw: {
            handlers: [...createHouseholdHandlers({ household: null, members: [] }), ...createInvitationHandlers({ outgoing: [], incoming: [] })]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const createButton = await canvas.findByRole("button", { name: "Create Household" });
        await userEvent.click(createButton);
        await expect(canvas.getByLabelText("Household name")).toBeInTheDocument();
    }
};

// Interactive: submitting the creation form shows loading state
export const CreateLoading: Story = {
    parameters: {
        msw: {
            handlers: [
                http.post("/api/household", async () => {
                    await delay("infinite");

                    return HttpResponse.json({});
                }),
                ...createHouseholdHandlers({ household: null, members: [] }),
                ...createInvitationHandlers({ outgoing: [], incoming: [] })
            ]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const createButton = await canvas.findByRole("button", { name: "Create Household" });
        await userEvent.click(createButton);

        const nameInput = canvas.getByLabelText("Household name");
        await userEvent.type(nameInput, "My New Household");

        const submitButton = canvas.getByRole("button", { name: "Create" });
        await userEvent.click(submitButton);

        await expect(canvas.getByRole("button", { name: "Creating..." })).toBeInTheDocument();
    }
};

// Interactive: sending an invite shows loading state on the button
export const SendInviteLoading: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createHouseholdHandlers({ household: defaultHousehold, members: defaultMembers }),
                ...createInvitationHandlers({ outgoing: [], incoming: [] })
            ]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const emailInput = await canvas.findByLabelText("Email address");
        await userEvent.type(emailInput, "newuser@example.com");

        const sendButton = canvas.getByRole("button", { name: "Send Invite" });
        await userEvent.click(sendButton);

        await expect(canvas.getByRole("button", { name: "Sending..." })).toBeInTheDocument();
    }
};

// Interactive: accepting an incoming invitation shows loading state
export const AcceptInvitationLoading: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createHouseholdHandlers({ household: defaultHousehold, members: defaultMembers }),
                ...createInvitationHandlers({
                    outgoing: [],
                    incoming: [
                        Object.assign({}, makeInvitation({ id: "inv-accept", householdId: "h-2", inviteeEmail: "alice@example.com" }), {
                            householdName: "Sunny Gardens"
                        })
                    ]
                })
            ]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const acceptButton = await canvas.findByRole("button", { name: "Accept" });
        await userEvent.click(acceptButton);

        await expect(canvas.getByRole("button", { name: "Accepting..." })).toBeInTheDocument();
    }
};

// Interactive: declining an incoming invitation shows loading state
export const DeclineInvitationLoading: Story = {
    parameters: {
        msw: {
            handlers: [
                ...createHouseholdHandlers({ household: defaultHousehold, members: defaultMembers }),
                ...createInvitationHandlers({
                    outgoing: [],
                    incoming: [
                        Object.assign({}, makeInvitation({ id: "inv-decline", householdId: "h-2", inviteeEmail: "alice@example.com" }), {
                            householdName: "Sunny Gardens"
                        })
                    ]
                })
            ]
        }
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const declineButton = await canvas.findByRole("button", { name: "Decline" });
        await userEvent.click(declineButton);

        await expect(canvas.getByRole("button", { name: "Declining..." })).toBeInTheDocument();
    }
};
