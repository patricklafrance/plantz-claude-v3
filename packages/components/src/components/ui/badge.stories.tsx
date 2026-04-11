import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge.tsx";

const meta = {
    title: "Components/Badge",
    component: Badge,
    args: {
        children: "Badge"
    },
    argTypes: {
        variant: {
            control: "select",
            options: ["default", "secondary", "destructive", "outline", "ghost", "link"]
        }
    }
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const Secondary = {
    args: { variant: "secondary" }
} satisfies Story;

export const Destructive = {
    args: { variant: "destructive" }
} satisfies Story;

export const Outline = {
    args: { variant: "outline" }
} satisfies Story;

export const Ghost = {
    args: { variant: "ghost" }
} satisfies Story;

export const Link = {
    args: { variant: "link" }
} satisfies Story;

const variants = ["default", "secondary", "destructive", "outline", "ghost", "link"] as const;

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-3">
            {variants.map(variant => (
                <Badge key={variant} variant={variant}>
                    {variant}
                </Badge>
            ))}
        </div>
    )
};
