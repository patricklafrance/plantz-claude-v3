import { formatDistanceToNow } from "date-fns";
import { Check, Droplets, Loader2 } from "lucide-react";
import { memo, useCallback } from "react";

import type { CareEvent } from "@packages/api/entities/care-events";
import type { HouseholdMember, ResponsibilityAssignment } from "@packages/api/entities/household";
import type { Plant } from "@packages/api/entities/plants";
import { Checkbox, Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@packages/components";

import { locations, wateringTypes } from "./constants.ts";
import { PLANT_LIST_GRID } from "./plantListLayout.ts";
import { getOptionLabel, isDueForWatering } from "./plantUtils.ts";

interface PlantListItemProps {
    plant: Plant;
    selected?: boolean | undefined;
    onClick: (plant: Plant) => void;
    onToggleSelect?: ((id: string) => void) | undefined;
    recentCareEvent?: CareEvent | null;
    assignment?: ResponsibilityAssignment | null;
    householdMembers?: HouseholdMember[];
    onAssignmentChange?: ((plantId: string, userId: string | null) => void) | undefined;
    isAssignmentPending?: boolean | undefined;
}

export const PlantListItem = memo(function PlantListItem({
    plant,
    selected = false,
    onClick,
    onToggleSelect,
    recentCareEvent,
    assignment,
    householdMembers,
    onAssignmentChange,
    isAssignmentPending = false
}: PlantListItemProps) {
    const due = isDueForWatering(plant);

    const handleToggleSelect = useCallback(() => onToggleSelect?.(plant.id), [onToggleSelect, plant.id]);
    const handleClick = useCallback(() => onClick(plant), [onClick, plant]);
    const handleAssignmentChange = useCallback(
        (value: string | null) => {
            if (value === null) {
                return;
            }

            const userId = value === "unassigned" ? null : value;
            onAssignmentChange?.(plant.id, userId);
        },
        [onAssignmentChange, plant.id]
    );

    const assignedName = assignment?.assignedUserName;
    const assignedDisplayName = assignment?.assignedUserId
        ? (householdMembers?.find(m => m.userId === assignment.assignedUserId)?.userName ?? assignment.assignedUserName ?? assignment.assignedUserId)
        : "Unassigned";

    return (
        <div
            className={`border-border relative flex h-full items-center gap-3 border-b px-5 py-2.5 transition-colors ${PLANT_LIST_GRID} ${due ? "bg-terracotta/5 border-l-terracotta border-l-2" : "hover:bg-secondary/40"}`}
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
            <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold">{plant.name}</span>
                    {due && (
                        <>
                            <Droplets className="text-terracotta size-3.5 shrink-0" aria-hidden="true" />
                            <span className="sr-only">Due for watering</span>
                        </>
                    )}
                </div>
                {recentCareEvent && (
                    <span className="text-muted-foreground text-xs">
                        Watered by {recentCareEvent.actorName} {formatDistanceToNow(recentCareEvent.timestamp, { addSuffix: true })}
                    </span>
                )}
                {assignedName && !householdMembers && <span className="text-muted-foreground text-xs">Assigned to {assignedName}</span>}
            </div>
            <span className="text-muted-foreground hidden truncate text-sm md:block">{plant.wateringQuantity}</span>
            <span className="text-muted-foreground hidden truncate text-sm md:block">{getOptionLabel(wateringTypes, plant.wateringType)}</span>
            <span className="text-muted-foreground hidden truncate text-sm md:block">{getOptionLabel(locations, plant.location)}</span>
            {householdMembers ? (
                <span className="relative z-10 hidden md:flex md:items-center">
                    {isAssignmentPending ? (
                        <Loader2 className="text-muted-foreground size-4 animate-spin" aria-label="Updating assignment" />
                    ) : (
                        <Select value={assignment?.assignedUserId ?? "unassigned"} onValueChange={handleAssignmentChange}>
                            <SelectTrigger size="sm" aria-label={`Assign ${plant.name}`}>
                                <SelectValue>{assignedDisplayName}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {householdMembers.map(member => (
                                        <SelectItem key={member.userId} value={member.userId}>
                                            {member.userName ?? member.userId}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    )}
                </span>
            ) : (
                <span className="hidden md:flex md:items-center">
                    {plant.mistLeaves && <Check className="text-muted-foreground size-3.5" aria-label="Mist leaves" />}
                </span>
            )}
        </div>
    );
});
