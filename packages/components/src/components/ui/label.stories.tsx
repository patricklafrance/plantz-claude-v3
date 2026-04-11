import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./checkbox.tsx";
import { Input } from "./input.tsx";
import { Label } from "./label.tsx";

const meta = {
    title: "Components/Label",
    component: Label,
    args: {
        children: "Label text"
    }
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const WithInput: Story = {
    render: () => (
        <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Enter your name..." />
        </div>
    )
};

export const WithCheckbox: Story = {
    render: () => (
        <div className="flex items-center gap-2">
            <Checkbox id="terms" />
            <Label htmlFor="terms">Accept terms and conditions</Label>
        </div>
    )
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">standalone</span>
                <Label>Standalone label</Label>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">with input</span>
                <Label htmlFor="all-variants-email">Email</Label>
                <Input id="all-variants-email" placeholder="you@example.com" />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">with checkbox</span>
                <div className="flex items-center gap-2">
                    <Checkbox id="all-variants-terms" />
                    <Label htmlFor="all-variants-terms">Accept terms</Label>
                </div>
            </div>
        </div>
    )
};
