import { formatDistanceToNow } from "date-fns";
import { Check, Droplets, Share2 } from "lucide-react";
import { memo, useCallback } from "react";

import type { Plant } from "@packages/api/entities/plants";
import { Checkbox } from "@packages/components";

import { locations, wateringTypes } from "./constants.ts";
import { PLANT_LIST_GRID } from "./plantListLayout.ts";
import { getOptionLabel, isDueForWatering } from "./plantUtils.ts";

interface PlantListItemProps {
    plant: Plant;
    selected?: boolean | undefined;
    onClick: (plant: Plant) => void;
    onToggleSelect?: ((id: string) => void) | undefined;
    currentUserId?: string | undefined;
}

function isRecentlyWateredByOther(plant: Plant, currentUserId?: string): boolean {
    if (!plant.lastCareEvent || !plant.householdId || !currentUserId) {
        return false;
    }

    const hoursSince = (Date.now() - plant.lastCareEvent.performedDate.getTime()) / (1000 * 60 * 60);

    return plant.lastCareEvent.actorName !== "Unknown" && hoursSince < 24 && plant.userId !== currentUserId;
}

export const PlantListItem = memo(function PlantListItem({ plant, selected = false, onClick, onToggleSelect, currentUserId }: PlantListItemProps) {
    const due = isDueForWatering(plant);
    const isShared = !!plant.householdId;
    const deEmphasize = isRecentlyWateredByOther(plant, currentUserId);

    const handleToggleSelect = useCallback(() => onToggleSelect?.(plant.id), [onToggleSelect, plant.id]);
    const handleClick = useCallback(() => onClick(plant), [onClick, plant]);

    return (
        <div
            className={`border-border relative flex h-full items-center gap-3 border-b px-5 py-2.5 transition-colors ${PLANT_LIST_GRID} ${due ? "bg-terracotta/5 border-l-terracotta border-l-2" : "hover:bg-secondary/40"} ${deEmphasize ? "opacity-50" : ""}`}
        >
            <button
                type="button"
                onClick={handleClick}
                aria-label={`View ${plant.name}`}
                className="focus-visible:outline-ring absolute inset-0 z-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
            />
            {onToggleSelect && (
                <span className="relative z-10">
                    <Checkbox checked={selected} onCheckedChange={handleToggleSelect} aria-label={`Select ${plant.name}`} />
                </span>
            )}
            <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{plant.name}</span>
                    {isShared && <Share2 className="text-botanical size-3.5 shrink-0" aria-label="Shared plant" />}
                    {due && (
                        <>
                            <Droplets className="text-terracotta size-3.5 shrink-0" aria-hidden="true" />
                            <span className="sr-only">Due for watering</span>
                        </>
                    )}
                </div>
                {plant.lastCareEvent && (
                    <span className="text-muted-foreground truncate text-xs">
                        {isShared
                            ? `Watered by ${plant.lastCareEvent.actorName} ${formatDistanceToNow(plant.lastCareEvent.performedDate, { addSuffix: true })}`
                            : `Last watered ${formatDistanceToNow(plant.lastCareEvent.performedDate, { addSuffix: true })}`}
                    </span>
                )}
            </div>
            <span className="text-muted-foreground hidden truncate text-sm md:block">{plant.wateringQuantity}</span>
            <span className="text-muted-foreground hidden truncate text-sm md:block">{getOptionLabel(wateringTypes, plant.wateringType)}</span>
            <span className="text-muted-foreground hidden truncate text-sm md:block">{getOptionLabel(locations, plant.location)}</span>
            <span className="hidden md:flex md:items-center">
                {plant.mistLeaves && <Check className="text-muted-foreground size-3.5" aria-label="Mist leaves" />}
            </span>
        </div>
    );
});
