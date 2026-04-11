import { Filter, Search, X } from "lucide-react";
import { useMemo } from "react";

import {
    Badge,
    Button,
    Input,
    Label,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
    Switch
} from "@packages/components";

import { locations, luminosities, wateringFrequencies, wateringTypes } from "./constants.ts";
import { getOptionLabel } from "./plantUtils.ts";
import type { PlantFilters } from "./usePlantFilters.ts";

interface FilterBarProps {
    filters: PlantFilters;
    onFilterChange: <K extends keyof PlantFilters>(key: K, value: PlantFilters[K]) => void;
    onClear: () => void;
    hasActiveFilters: boolean;
    showDueForWatering?: boolean;
}

function FilterRow({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <Label htmlFor={htmlFor} className="text-sm font-medium whitespace-nowrap">
                {label}
            </Label>
            {children}
        </div>
    );
}

function FilterSelect({
    id,
    value,
    onChange,
    options
}: {
    id: string;
    value: string | null;
    onChange: (value: string | null) => void;
    options: readonly { id: string; label: string }[];
}) {
    return (
        <Select value={value ?? ""} onValueChange={val => onChange(!val || val === "" ? null : val)}>
            <SelectTrigger size="sm" className="w-36" id={id} aria-label={id}>
                <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectItem value="">All</SelectItem>
                    {options.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    );
}

export function FilterBar({ filters, onFilterChange, onClear, hasActiveFilters, showDueForWatering = true }: FilterBarProps) {
    const activePopoverCount = useMemo(() => {
        return [
            filters.location,
            filters.luminosity,
            filters.mistLeaves !== null,
            filters.soilType,
            filters.wateringFrequency,
            filters.wateringType,
            showDueForWatering && filters.dueForWatering
        ].filter(Boolean).length;
    }, [filters, showDueForWatering]);

    const activeChips = useMemo(() => {
        const chips: { key: string; label: string; onRemove: () => void }[] = [];

        if (filters.location) {
            chips.push({ key: "location", label: getOptionLabel(locations, filters.location), onRemove: () => onFilterChange("location", null) });
        }
        if (filters.luminosity) {
            chips.push({
                key: "luminosity",
                label: getOptionLabel(luminosities, filters.luminosity),
                onRemove: () => onFilterChange("luminosity", null)
            });
        }
        if (filters.mistLeaves !== null) {
            chips.push({ key: "mistLeaves", label: "Mist leaves", onRemove: () => onFilterChange("mistLeaves", null) });
        }
        if (filters.soilType) {
            chips.push({ key: "soilType", label: `Soil: ${filters.soilType}`, onRemove: () => onFilterChange("soilType", "") });
        }
        if (filters.wateringFrequency) {
            chips.push({
                key: "wateringFrequency",
                label: getOptionLabel(wateringFrequencies, filters.wateringFrequency),
                onRemove: () => onFilterChange("wateringFrequency", null)
            });
        }
        if (filters.wateringType) {
            chips.push({
                key: "wateringType",
                label: getOptionLabel(wateringTypes, filters.wateringType),
                onRemove: () => onFilterChange("wateringType", null)
            });
        }
        if (showDueForWatering && filters.dueForWatering) {
            chips.push({ key: "dueForWatering", label: "Due for watering", onRemove: () => onFilterChange("dueForWatering", false) });
        }

        return chips;
    }, [filters, onFilterChange, showDueForWatering]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <div className="relative max-w-xs flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                        className="h-8 pl-8 text-sm"
                        placeholder="Search plants..."
                        value={filters.name}
                        onChange={e => onFilterChange("name", e.target.value)}
                        aria-label="Search plants by name"
                    />
                </div>

                <Popover>
                    <PopoverTrigger
                        render={
                            // oxlint-disable-next-line react-perf/jsx-no-jsx-as-prop -- Base UI render prop API
                            <Button variant="outline" size="sm" />
                        }
                    >
                        <Filter data-icon="inline-start" />
                        Filters
                        {activePopoverCount > 0 && <Badge className="ml-0.5 min-w-5 rounded-full px-1 text-[10px]">{activePopoverCount}</Badge>}
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-80 p-0">
                        <div className="flex flex-col">
                            <div className="flex flex-col gap-3 p-4">
                                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Environment</h4>
                                <FilterRow label="Location" htmlFor="filter-location">
                                    <FilterSelect
                                        id="filter-location"
                                        value={filters.location}
                                        onChange={v => onFilterChange("location", v)}
                                        options={locations}
                                    />
                                </FilterRow>
                                <FilterRow label="Luminosity" htmlFor="filter-luminosity">
                                    <FilterSelect
                                        id="filter-luminosity"
                                        value={filters.luminosity}
                                        onChange={v => onFilterChange("luminosity", v)}
                                        options={luminosities}
                                    />
                                </FilterRow>
                                <FilterRow label="Mist leaves" htmlFor="filter-mist">
                                    <Switch
                                        id="filter-mist"
                                        size="sm"
                                        checked={filters.mistLeaves === true}
                                        onCheckedChange={checked => onFilterChange("mistLeaves", checked ? true : null)}
                                    />
                                </FilterRow>
                                <FilterRow label="Soil type" htmlFor="filter-soil">
                                    <Input
                                        id="filter-soil"
                                        className="h-7 w-36 text-xs"
                                        placeholder="Any"
                                        value={filters.soilType}
                                        onChange={e => onFilterChange("soilType", e.target.value)}
                                    />
                                </FilterRow>
                            </div>
                            <Separator />
                            <div className="flex flex-col gap-3 p-4">
                                <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Watering</h4>
                                <FilterRow label="Frequency" htmlFor="filter-frequency">
                                    <FilterSelect
                                        id="filter-frequency"
                                        value={filters.wateringFrequency}
                                        onChange={v => onFilterChange("wateringFrequency", v)}
                                        options={wateringFrequencies}
                                    />
                                </FilterRow>
                                <FilterRow label="Type" htmlFor="filter-type">
                                    <FilterSelect
                                        id="filter-type"
                                        value={filters.wateringType}
                                        onChange={v => onFilterChange("wateringType", v)}
                                        options={wateringTypes}
                                    />
                                </FilterRow>
                                {showDueForWatering && (
                                    <FilterRow label="Due for watering" htmlFor="filter-due">
                                        <Switch
                                            id="filter-due"
                                            size="sm"
                                            checked={filters.dueForWatering}
                                            onCheckedChange={checked => onFilterChange("dueForWatering", checked)}
                                        />
                                    </FilterRow>
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
                        Clear all
                    </Button>
                )}
            </div>

            {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {activeChips.map(chip => (
                        <Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
                            {chip.label}
                            <button
                                type="button"
                                onClick={chip.onRemove}
                                className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                                aria-label={`Remove ${chip.label} filter`}
                            >
                                <X className="size-2.5" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
