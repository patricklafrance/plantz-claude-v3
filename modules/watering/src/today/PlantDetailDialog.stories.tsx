import type { Meta, StoryObj } from "@storybook/react-vite";
import { useQueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { screen, userEvent, within } from "storybook/test";

import type { Plant } from "@packages/api/entities/plants";
import { createCareEventsHandler } from "@packages/api/handlers/today";

import { PlantDetailDialog } from "./PlantDetailDialog.tsx";
import { queryDecorator, fireflyDecorator } from "./storybook.setup.tsx";

const FAR_PAST = new Date(2020, 0, 1, 0, 0, 0, 0);
const FIXED_CREATION = new Date(2025, 0, 1, 0, 0, 0, 0);

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
        nextWateringDate: FAR_PAST,
        creationDate: FIXED_CREATION,
        lastUpdateDate: FIXED_CREATION,
        ...overrides
    };
}

const emptyCareEventsHandler = createCareEventsHandler("test-1", []);

const meta = {
    title: "Watering/Today/Components/PlantDetailDialog",
    component: PlantDetailDialog,
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
            handlers: [emptyCareEventsHandler]
        }
    },
    args: {
        open: true,
        onOpenChange: () => {}
    }
} satisfies Meta<typeof PlantDetailDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        plant: makePlant()
    }
};

export const WithCareEvent: Story = {
    args: {
        plant: makePlant()
    },
    parameters: {
        msw: {
            handlers: [
                createCareEventsHandler("test-1", [
                    {
                        id: "event-1",
                        action: "watered",
                        performedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
                        actorName: "Alice"
                    }
                ])
            ]
        }
    }
};

export const NoCareEvents: Story = {
    args: {
        plant: makePlant()
    }
};

export const MinimalFields: Story = {
    args: {
        plant: makePlant({
            description: undefined,
            family: undefined,
            soilType: undefined
        })
    }
};

export const LongValues: Story = {
    args: {
        plant: makePlant({
            name: "Philodendron Birkin Variegated Extra Special Limited Edition",
            description:
                "A rare variegated cultivar of the Philodendron Birkin with stunning white pinstripe patterns on dark green leaves. Requires consistent humidity and indirect light.",
            wateringQuantity: "500ml every other day when soil is dry"
        })
    }
};

export const WithMarkWatered: Story = {
    args: {
        plant: makePlant(),
        onMarkWatered: () => {}
    },
    parameters: {
        msw: {
            handlers: [
                createCareEventsHandler("test-1", [
                    {
                        id: "event-1",
                        action: "watered",
                        performedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
                        actorName: "Alice"
                    }
                ])
            ]
        }
    }
};

// --- Play-function stories for interactive criteria ---

function MarkWateredWrapper({ plant }: { plant: Plant }) {
    const queryClient = useQueryClient();

    const handleMarkWatered = async () => {
        await fetch(`/api/today/plants/${plant.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nextWateringDate: new Date() })
        });

        await queryClient.invalidateQueries({ queryKey: ["today", "care-events", plant.id] });
    };

    return <PlantDetailDialog plant={plant} open onOpenChange={() => {}} onMarkWatered={handleMarkWatered} />;
}

/**
 * After marking a plant as watered, the care event appears in the detail dialog.
 * The displayed actor name matches the user who performed the watering action.
 *
 * Play function clicks "Mark as Watered" and waits for the care event to appear.
 * MSW handlers transition from empty care events to populated after the PUT.
 */
export const MarkWateredShowsCareEvent: Story = {
    parameters: {
        msw: {
            handlers: (() => {
                let watered = false;

                return [
                    http.put("/api/today/plants/:id", () => {
                        watered = true;

                        return HttpResponse.json({
                            ...makePlant(),
                            lastCareEvent: {
                                actorName: "Alice",
                                performedDate: new Date().toISOString()
                            }
                        });
                    }),
                    http.get("/api/today/plants/:id/care-events", () => {
                        if (!watered) {
                            return HttpResponse.json({ events: [] });
                        }

                        return HttpResponse.json({
                            events: [
                                {
                                    id: "evt-1",
                                    action: "watered",
                                    performedDate: new Date().toISOString(),
                                    actorName: "Alice"
                                }
                            ]
                        });
                    })
                ];
            })()
        }
    },
    args: {
        plant: makePlant(),
        open: true,
        onOpenChange: () => {}
    },
    render: () => <MarkWateredWrapper plant={makePlant()} />,
    play: async () => {
        // The dialog renders in a portal, so use screen for portal content
        const dialog = await screen.findByRole("dialog");
        const dialogScope = within(dialog);

        await userEvent.click(dialogScope.getByRole("button", { name: /mark as watered/i }));

        // Wait for the care event to appear after mutation + query invalidation
        await screen.findByText(/watered by alice/i, {}, { timeout: 5000 });
    }
};
