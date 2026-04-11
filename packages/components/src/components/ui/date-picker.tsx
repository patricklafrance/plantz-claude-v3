import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils.ts";
import { Button } from "./button.tsx";
import { Calendar } from "./calendar.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";

function DatePicker({
    value,
    onChange,
    placeholder = "Pick a date",
    disabled = false,
    className,
    id,
    "aria-describedby": ariaDescribedBy
}: {
    value?: Date;
    onChange?: (date: Date | undefined) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
    "aria-describedby"?: string;
}) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    // oxlint-disable-next-line react-perf/jsx-no-jsx-as-prop -- Base UI render prop API
                    <Button
                        variant="outline"
                        disabled={disabled}
                        id={id}
                        aria-describedby={ariaDescribedBy}
                        className={cn("w-[240px] justify-start text-left font-normal", !value && "text-muted-foreground", className)}
                    />
                }
            >
                <CalendarIcon data-icon="inline-start" />
                {value ? format(value, "PPP") : <span>{placeholder}</span>}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={value}
                    onSelect={date => {
                        onChange?.(date);
                        setOpen(false);
                    }}
                    autoFocus
                />
            </PopoverContent>
        </Popover>
    );
}

export { DatePicker };
