import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./label.tsx";
import { Textarea } from "./textarea.tsx";

const meta = {
    title: "Components/Textarea",
    component: Textarea,
    args: {
        placeholder: "Enter text..."
    }
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const WithValue = {
    args: { defaultValue: "This is some default text content in the textarea." }
} satisfies Story;

export const Disabled = {
    args: { disabled: true, defaultValue: "Disabled textarea" }
} satisfies Story;

export const WithLabel: Story = {
    render: () => (
        <div className="flex flex-col gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" placeholder="Type your message..." />
        </div>
    )
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">default</span>
                <Textarea placeholder="Default textarea..." />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">with value</span>
                <Textarea defaultValue="This textarea has pre-filled content." aria-label="Pre-filled content" />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">disabled</span>
                <Textarea disabled defaultValue="Disabled textarea" aria-label="Disabled textarea" />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">with label</span>
                <Label htmlFor="all-variants-message">Message</Label>
                <Textarea id="all-variants-message" placeholder="Type your message..." />
            </div>
        </div>
    )
};
