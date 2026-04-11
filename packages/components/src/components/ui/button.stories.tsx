import type { Meta, StoryObj } from "@storybook/react-vite";
import { Leaf } from "lucide-react";

import { Button } from "./button.tsx";

const meta = {
    title: "Components/Button",
    component: Button,
    args: {
        children: "Button"
    },
    argTypes: {
        variant: {
            control: "select",
            options: ["default", "outline", "secondary", "ghost", "destructive", "link"]
        },
        size: {
            control: "select",
            options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"]
        }
    }
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const Outline = {
    args: { variant: "outline" }
} satisfies Story;

export const Secondary = {
    args: { variant: "secondary" }
} satisfies Story;

export const Ghost = {
    args: { variant: "ghost" }
} satisfies Story;

export const Destructive = {
    args: { variant: "destructive" }
} satisfies Story;

export const Link = {
    args: { variant: "link" }
} satisfies Story;

export const SizeXs = {
    args: { size: "xs" }
} satisfies Story;

export const SizeSm = {
    args: { size: "sm" }
} satisfies Story;

export const SizeLg = {
    args: { size: "lg" }
} satisfies Story;

export const Icon = {
    args: { size: "icon", children: <Leaf />, "aria-label": "Add leaf" }
} satisfies Story;

export const IconXs = {
    args: { size: "icon-xs", children: <Leaf />, "aria-label": "Add leaf" }
} satisfies Story;

export const IconSm = {
    args: { size: "icon-sm", children: <Leaf />, "aria-label": "Add leaf" }
} satisfies Story;

export const IconLg = {
    args: { size: "icon-lg", children: <Leaf />, "aria-label": "Add leaf" }
} satisfies Story;

const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const sizes = ["default", "xs", "sm", "lg"] as const;
const iconSizes = ["icon", "icon-xs", "icon-sm", "icon-lg"] as const;

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            {variants.map(variant => (
                <div key={variant} className="flex flex-col gap-2">
                    <span className="text-muted-foreground text-sm font-medium">{variant}</span>
                    <div className="flex items-center gap-2">
                        {sizes.map(size => (
                            <Button key={size} variant={variant} size={size}>
                                {size}
                            </Button>
                        ))}
                        {iconSizes.map(size => (
                            <Button key={size} variant={variant} size={size} aria-label={`${variant} ${size}`}>
                                <Leaf />
                            </Button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
};
