import type { Meta, StoryObj } from "@storybook/react-vite";

import { Separator } from "./separator.tsx";

const meta = {
    title: "Components/Separator",
    component: Separator,
    argTypes: {
        orientation: {
            control: "select",
            options: ["horizontal", "vertical"]
        }
    }
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
    args: { orientation: "horizontal" },
    decorators: [
        Story => (
            <div className="w-64">
                <Story />
            </div>
        )
    ]
};

export const Vertical: Story = {
    args: { orientation: "vertical" },
    decorators: [
        Story => (
            <div className="flex h-16">
                <Story />
            </div>
        )
    ]
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">horizontal</span>
                <div className="w-64">
                    <div className="py-2 text-sm">Content above</div>
                    <Separator orientation="horizontal" />
                    <div className="py-2 text-sm">Content below</div>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">vertical</span>
                <div className="flex h-8 items-center gap-4">
                    <span className="text-sm">Left</span>
                    <Separator orientation="vertical" />
                    <span className="text-sm">Right</span>
                </div>
            </div>
        </div>
    )
};
