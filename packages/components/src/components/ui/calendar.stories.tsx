import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { Calendar } from "./calendar.tsx";

// Fixed dates for deterministic Chromatic snapshots — stories always show March 2026
// and highlight March 10 as "today".
const FIXED_MONTH = new Date(2026, 2, 1);
const FIXED_TODAY = new Date(2026, 2, 10);

const meta = {
    title: "Components/Calendar",
    component: Calendar,
    args: {
        mode: "single",
        month: FIXED_MONTH,
        today: FIXED_TODAY
    }
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const WithSelectedDate: Story = {
    args: {
        mode: "single",
        selected: new Date(2026, 2, 6)
    }
};

export const WithOutsideDaysHidden: Story = {
    args: {
        showOutsideDays: false
    }
};

export const WithMultipleMonths: Story = {
    args: {
        numberOfMonths: 2
    }
};

export const WithDropdownCaption: Story = {
    args: {
        captionLayout: "dropdown",
        startMonth: new Date(2020, 0),
        endMonth: new Date(2030, 11)
    }
};

export const RangeSelection: Story = {
    render: () => {
        // oxlint-disable-next-line react/rules-of-hooks -- CSF3 render functions are valid React components
        const [range, setRange] = React.useState<DateRange>({
            from: new Date(2026, 2, 6),
            to: new Date(2026, 2, 12)
        });

        return (
            <Calendar
                mode="range"
                month={FIXED_MONTH}
                today={FIXED_TODAY}
                selected={range}
                onSelect={value => {
                    if (value) {
                        setRange(value);
                    }
                }}
            />
        );
    }
};

export const Disabled: Story = {
    args: {
        disabled: true
    }
};

export const WithWeekNumbers: Story = {
    args: {
        showWeekNumber: true
    }
};

export const AllVariants: Story = {
    render: () => (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Default (single)</span>
                <Calendar
                    mode="single"
                    month={FIXED_MONTH}
                    today={FIXED_TODAY}
                    selected={new Date(2026, 2, 6)}
                    labels={{ labelNav: () => "Single selection navigation" }}
                />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Range selection</span>
                <Calendar
                    mode="range"
                    month={FIXED_MONTH}
                    today={FIXED_TODAY}
                    selected={{ from: new Date(2026, 2, 6), to: new Date(2026, 2, 12) }}
                    labels={{ labelNav: () => "Range selection navigation" }}
                />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Multiple months</span>
                <Calendar
                    mode="single"
                    month={FIXED_MONTH}
                    today={FIXED_TODAY}
                    numberOfMonths={2}
                    labels={{ labelNav: () => "Multiple months navigation" }}
                />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Dropdown caption</span>
                <Calendar
                    mode="single"
                    month={FIXED_MONTH}
                    today={FIXED_TODAY}
                    captionLayout="dropdown"
                    startMonth={new Date(2020, 0)}
                    endMonth={new Date(2030, 11)}
                    labels={{ labelNav: () => "Dropdown caption navigation" }}
                />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">Outside days hidden</span>
                <Calendar
                    mode="single"
                    month={FIXED_MONTH}
                    today={FIXED_TODAY}
                    showOutsideDays={false}
                    labels={{ labelNav: () => "Outside days hidden navigation" }}
                />
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-sm font-medium">With week numbers</span>
                <Calendar
                    mode="single"
                    month={FIXED_MONTH}
                    today={FIXED_TODAY}
                    showWeekNumber
                    labels={{ labelNav: () => "Week numbers navigation" }}
                />
            </div>
        </div>
    )
};
