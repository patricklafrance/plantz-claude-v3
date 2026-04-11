import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./label.tsx";
import { Switch } from "./switch.tsx";

const meta = {
    title: "Components/Switch",
    component: Switch,
    args: {
        "aria-label": "Toggle"
    },
    argTypes: {
        size: {
            control: "select",
            options: ["default", "sm"]
        }
    }
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const SmallSize = {
    args: { size: "sm" }
} satisfies Story;

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
            <Switch id="airplane-mode" />
            <Label htmlFor="airplane-mode">Airplane Mode</Label>
        </div>
    )
};

export const AllVariants: Story = {
    render: () => {
        const sizes = ["default", "sm"] as const;

        return (
            <div className="flex flex-col gap-6">
                {sizes.map(size => (
                    <div key={size} className="flex flex-col gap-2">
                        <span className="text-muted-foreground text-sm font-medium">{size}</span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch id={`${size}-unchecked`} size={size} />
                                <Label htmlFor={`${size}-unchecked`}>Unchecked</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch id={`${size}-checked`} size={size} defaultChecked />
                                <Label htmlFor={`${size}-checked`}>Checked</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch id={`${size}-disabled`} size={size} disabled />
                                <Label htmlFor={`${size}-disabled`}>Disabled</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch id={`${size}-disabled-checked`} size={size} disabled defaultChecked />
                                <Label htmlFor={`${size}-disabled-checked`}>Disabled Checked</Label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
};
