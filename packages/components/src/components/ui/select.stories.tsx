import type { Meta, StoryObj } from "@storybook/react-vite";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "./select.tsx";

const meta = {
    title: "Components/Select",
    component: Select
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <Select>
            <SelectTrigger aria-label="Fruit">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="cherry">Cherry</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    )
};

export const SmallSize: Story = {
    render: () => (
        <Select>
            <SelectTrigger size="sm" aria-label="Fruit">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="cherry">Cherry</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    )
};

export const WithGroups: Story = {
    render: () => (
        <Select>
            <SelectTrigger aria-label="Food">
                <SelectValue placeholder="Select a food" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Fruits</SelectLabel>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="cherry">Cherry</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                    <SelectLabel>Vegetables</SelectLabel>
                    <SelectItem value="carrot">Carrot</SelectItem>
                    <SelectItem value="celery">Celery</SelectItem>
                    <SelectItem value="lettuce">Lettuce</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    )
};

export const WithDisabledItems: Story = {
    render: () => (
        <Select>
            <SelectTrigger aria-label="Fruit">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana" disabled>
                        Banana
                    </SelectItem>
                    <SelectItem value="cherry">Cherry</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    )
};

export const Disabled: Story = {
    render: () => (
        <Select disabled>
            <SelectTrigger aria-label="Fruit">
                <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="apple">Apple</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                </SelectGroup>
            </SelectContent>
        </Select>
    )
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Default size</span>
                <Select>
                    <SelectTrigger aria-label="Default size">
                        <SelectValue placeholder="Default size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="apple">Apple</SelectItem>
                            <SelectItem value="banana">Banana</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Small size</span>
                <Select>
                    <SelectTrigger size="sm" aria-label="Small size">
                        <SelectValue placeholder="Small size" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="apple">Apple</SelectItem>
                            <SelectItem value="banana">Banana</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">With groups and labels</span>
                <Select>
                    <SelectTrigger aria-label="Grouped items">
                        <SelectValue placeholder="Grouped items" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Fruits</SelectLabel>
                            <SelectItem value="apple">Apple</SelectItem>
                            <SelectItem value="banana">Banana</SelectItem>
                        </SelectGroup>
                        <SelectSeparator />
                        <SelectGroup>
                            <SelectLabel>Vegetables</SelectLabel>
                            <SelectItem value="carrot">Carrot</SelectItem>
                            <SelectItem value="celery">Celery</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Disabled</span>
                <Select disabled>
                    <SelectTrigger aria-label="Disabled">
                        <SelectValue placeholder="Disabled" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="apple">Apple</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
};
