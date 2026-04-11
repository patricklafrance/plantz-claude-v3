import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button.tsx";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "./popover.tsx";

const meta = {
    title: "Components/Popover",
    component: Popover
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>Open popover</PopoverTrigger>
            <PopoverContent>
                <PopoverHeader>
                    <PopoverTitle>Popover title</PopoverTitle>
                    <PopoverDescription>This is a simple popover with a title and description.</PopoverDescription>
                </PopoverHeader>
            </PopoverContent>
        </Popover>
    )
};

export const AlignStart: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>Align start</PopoverTrigger>
            <PopoverContent align="start">
                <PopoverHeader>
                    <PopoverTitle>Start aligned</PopoverTitle>
                    <PopoverDescription>This popover is aligned to the start of the trigger.</PopoverDescription>
                </PopoverHeader>
            </PopoverContent>
        </Popover>
    )
};

export const AlignEnd: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>Align end</PopoverTrigger>
            <PopoverContent align="end">
                <PopoverHeader>
                    <PopoverTitle>End aligned</PopoverTitle>
                    <PopoverDescription>This popover is aligned to the end of the trigger.</PopoverDescription>
                </PopoverHeader>
            </PopoverContent>
        </Popover>
    )
};

export const WithCustomContent: Story = {
    render: () => (
        <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>Settings</PopoverTrigger>
            <PopoverContent>
                <PopoverHeader>
                    <PopoverTitle>Dimensions</PopoverTitle>
                    <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
                </PopoverHeader>
                <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                        <label htmlFor="popover-width" className="text-sm">
                            Width
                        </label>
                        <input id="popover-width" className="col-span-2 h-8 rounded-md border px-2 text-sm" defaultValue="100%" />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                        <label htmlFor="popover-height" className="text-sm">
                            Height
                        </label>
                        <input id="popover-height" className="col-span-2 h-8 rounded-md border px-2 text-sm" defaultValue="25px" />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex items-center gap-4">
            <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>Center</PopoverTrigger>
                <PopoverContent align="center">
                    <PopoverHeader>
                        <PopoverTitle>Center aligned</PopoverTitle>
                        <PopoverDescription>Default alignment.</PopoverDescription>
                    </PopoverHeader>
                </PopoverContent>
            </Popover>
            <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>Start</PopoverTrigger>
                <PopoverContent align="start">
                    <PopoverHeader>
                        <PopoverTitle>Start aligned</PopoverTitle>
                        <PopoverDescription>Aligned to the start.</PopoverDescription>
                    </PopoverHeader>
                </PopoverContent>
            </Popover>
            <Popover>
                <PopoverTrigger render={<Button variant="outline" />}>End</PopoverTrigger>
                <PopoverContent align="end">
                    <PopoverHeader>
                        <PopoverTitle>End aligned</PopoverTitle>
                        <PopoverDescription>Aligned to the end.</PopoverDescription>
                    </PopoverHeader>
                </PopoverContent>
            </Popover>
        </div>
    )
};
