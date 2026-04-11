import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input.tsx";
import { Label } from "./label.tsx";

const meta = {
    title: "Components/Input",
    component: Input,
    args: {
        placeholder: "Enter text..."
    }
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const WithValue = {
    args: { defaultValue: "Hello World" }
} satisfies Story;

export const Password = {
    args: { type: "password", placeholder: "Enter password..." }
} satisfies Story;

export const Email = {
    args: { type: "email", placeholder: "Enter email..." }
} satisfies Story;

export const Number = {
    args: { type: "number", placeholder: "Enter number..." }
} satisfies Story;

export const File = {
    args: { type: "file", placeholder: undefined, "aria-label": "Upload file" }
} satisfies Story;

export const Disabled = {
    args: { disabled: true, defaultValue: "Disabled input" }
} satisfies Story;

export const WithLabel: Story = {
    render: () => (
        <div className="flex flex-col gap-2">
            <Label htmlFor="email-input">Email</Label>
            <Input id="email-input" type="email" placeholder="Enter your email..." />
        </div>
    )
};

export const AllVariants: Story = {
    render: () => {
        const types = ["text", "password", "email", "number"] as const;

        return (
            <div className="flex flex-col gap-6">
                {types.map(type => (
                    <div key={type} className="flex flex-col gap-2">
                        <span className="text-muted-foreground text-sm font-medium">{type}</span>
                        <Input type={type} placeholder={`${type} input...`} />
                    </div>
                ))}
                <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-sm font-medium">file</span>
                    <Input type="file" aria-label="Upload file" />
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-sm font-medium">disabled</span>
                    <Input disabled defaultValue="Disabled input" aria-label="Disabled input" />
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-sm font-medium">with label</span>
                    <Label htmlFor="all-variants-email">Email</Label>
                    <Input id="all-variants-email" type="email" placeholder="you@example.com" />
                </div>
            </div>
        );
    }
};
