import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "./checkbox.tsx";
import { Label } from "./label.tsx";

const meta = {
    title: "Components/Checkbox",
    component: Checkbox,
    args: {
        "aria-label": "Toggle"
    }
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const Checked = {
    args: { defaultChecked: true }
} satisfies Story;

export const Disabled = {
    args: { disabled: true }
} satisfies Story;

export const DisabledChecked = {
    args: { disabled: true, defaultChecked: true }
} satisfies Story;

export const WithLabel: Story = {
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
                <span className="text-muted-foreground text-sm font-medium">unchecked</span>
                <div className="flex items-center gap-2">
                    <Checkbox id="all-unchecked" />
                    <Label htmlFor="all-unchecked">Unchecked</Label>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">checked</span>
                <div className="flex items-center gap-2">
                    <Checkbox id="all-checked" defaultChecked />
                    <Label htmlFor="all-checked">Checked</Label>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">disabled</span>
                <div className="flex items-center gap-2">
                    <Checkbox id="all-disabled" disabled />
                    <Label htmlFor="all-disabled">Disabled</Label>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">disabled checked</span>
                <div className="flex items-center gap-2">
                    <Checkbox id="all-disabled-checked" disabled defaultChecked />
                    <Label htmlFor="all-disabled-checked">Disabled Checked</Label>
                </div>
            </div>
        </div>
    )
};
