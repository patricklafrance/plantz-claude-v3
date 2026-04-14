import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useState, useRef, useMemo, useCallback } from "react";

import type { CareEvent } from "@packages/api/entities/care-events";
import type { HouseholdMember } from "@packages/api/entities/household";
import type { Plant } from "@packages/api/entities/plants";
import { getFrequencyDays } from "@packages/api/entities/plants";
import { Button, toast } from "@packages/components";
import { useSession } from "@packages/core-module";

import { FilterBar } from "./FilterBar.tsx";
import { PlantDetailDialog } from "./PlantDetailDialog.tsx";
import { PlantListHeader } from "./PlantListHeader.tsx";
import { PlantListItem } from "./PlantListItem.tsx";
import { applyPlantFilters, isDueForWatering } from "./plantUtils.ts";
import { usePlantFilters } from "./usePlantFilters.ts";
import {
    useTodayPlants,
    useMarkWatered,
    useCareEvents,
    useAllCareEvents,
    useHousehold,
    useHouseholdMembers,
    useCreateAssignment,
    useUpdateAssignment,
    useDeleteAssignment,
    type PlantWithAssignment
} from "./useTodayPlants.ts";

function computeNextWateringDate(plant: Plant): Date {
    const days = getFrequencyDays(plant.wateringFrequency);
    const next = new Date();
    next.setDate(next.getDate() + days);
    next.setHours(0, 0, 0, 0);

    return next;
}

interface PlantSectionProps {
    title: string;
    plants: PlantWithAssignment[];
    selectedIds: Set<string>;
    careEventsByPlant: Map<string, CareEvent>;
    onToggleSelect: (id: string) => void;
    onViewDetail: (plant: Plant) => void;
    householdMembers?: HouseholdMember[];
    onAssignmentChange?: (plantId: string, userId: string | null) => void;
    pendingPlantId?: string | null;
    emptyMessage?: string;
}

function PlantSection({
    title,
    plants,
    selectedIds,
    careEventsByPlant,
    onToggleSelect,
    onViewDetail,
    householdMembers,
    onAssignmentChange,
    pendingPlantId,
    emptyMessage
}: PlantSectionProps) {
    return (
        <div className="flex flex-col gap-2">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{title}</h2>
            {plants.length === 0 ? (
                <div className="bg-card border-border/50 flex items-center justify-center rounded-lg border p-6">
                    <p className="text-muted-foreground text-sm">{emptyMessage ?? "No tasks in this section."}</p>
                </div>
            ) : (
                <div className="bg-card border-border/50 overflow-hidden rounded-xl border shadow-sm">
                    <PlantListHeader selectAllChecked={false} />
                    <div role="list" aria-label={title}>
                        {plants.map(plant => (
                            <div key={plant.id} role="listitem">
                                <PlantListItem
                                    plant={plant}
                                    selected={selectedIds.has(plant.id)}
                                    onToggleSelect={onToggleSelect}
                                    onClick={onViewDetail}
                                    recentCareEvent={careEventsByPlant.get(plant.id)}
                                    assignment={plant.assignment}
                                    householdMembers={householdMembers}
                                    onAssignmentChange={onAssignmentChange}
                                    isAssignmentPending={pendingPlantId === plant.id}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export function LandingPage() {
    const { filters, updateFilter, clearFilters, hasActiveFilters } = usePlantFilters();
    const [detailPlant, setDetailPlant] = useState<Plant | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [pendingPlantId, setPendingPlantId] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const session = useSession();
    const { data: allPlants, isPending, isError } = useTodayPlants();
    const markWatered = useMarkWatered();

    // Household data for partitioned view
    const { data: household } = useHousehold();
    const { data: householdMembers } = useHouseholdMembers(household?.id);

    // Assignment mutations
    const createAssignment = useCreateAssignment();
    const updateAssignment = useUpdateAssignment();
    const deleteAssignment = useDeleteAssignment();

    // Fetch care events for the detail dialog plant
    const { data: detailCareEvents } = useCareEvents(detailPlant?.id);
    const detailRecentCareEvent = detailCareEvents?.[0] ?? null;

    // Fetch all care events for list attribution (single query for virtualizer)
    const { data: allCareEvents } = useAllCareEvents();
    const careEventsByPlant = useMemo(() => {
        if (!allCareEvents) {
            return new Map<string, CareEvent>();
        }

        const map = new Map<string, CareEvent>();
        for (const event of allCareEvents) {
            // Only keep the most recent event per plant (list is already sorted by timestamp desc)
            if (!map.has(event.plantId)) {
                map.set(event.plantId, event);
            }
        }

        return map;
    }, [allCareEvents]);

    const plants = useMemo(() => {
        if (!allPlants) {
            return [];
        }

        // First sort by name, then filter to only plants due for watering, then apply user filters
        const sorted = allPlants.toSorted((a, b) => a.name.localeCompare(b.name));
        const duePlants = sorted.filter(p => isDueForWatering(p));

        return applyPlantFilters(duePlants, filters) as PlantWithAssignment[];
    }, [allPlants, filters]);

    // Partitioned view: split into my tasks, others' tasks, and available
    const isHouseholdView = !!household && !!session;

    const { myTasks, othersTasks, availableTasks } = useMemo(() => {
        if (!isHouseholdView) {
            return { myTasks: [], othersTasks: [], availableTasks: [] };
        }

        const my: PlantWithAssignment[] = [];
        const others: PlantWithAssignment[] = [];
        const available: PlantWithAssignment[] = [];

        for (const plant of plants) {
            const assignment = plant.assignment;

            if (!assignment || assignment.assignedUserId === null) {
                available.push(plant);
            } else if (assignment.assignedUserId === session.id) {
                my.push(plant);
            } else {
                others.push(plant);
            }
        }

        return { myTasks: my, othersTasks: others, availableTasks: available };
    }, [plants, isHouseholdView, session]);

    const virtualizer = useWindowVirtualizer({
        count: isHouseholdView ? 0 : plants.length,
        estimateSize: () => 49,
        overscan: 10,
        scrollMargin: (listRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY
    });

    const allSelected = plants.length > 0 && plants.every(p => selectedIds.has(p.id));

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(plants.map(p => p.id)));
        }
    }, [allSelected, plants]);

    const handleViewDetail = useCallback((plant: Plant) => {
        setDetailPlant(plant);
    }, []);

    const handleDetailOpenChange = useCallback((open: boolean) => {
        if (!open) {
            setDetailPlant(null);
        }
    }, []);

    const handleMarkWatered = useCallback(() => {
        if (!detailPlant) {
            return;
        }

        markWatered.mutate(
            { id: detailPlant.id, nextWateringDate: computeNextWateringDate(detailPlant) },
            {
                onSuccess: () => {
                    toast.success(`${detailPlant.name} marked as watered`);
                    setDetailPlant(null);
                },
                onError: () => toast.error(`Failed to mark ${detailPlant.name} as watered`)
            }
        );
    }, [detailPlant, markWatered]);

    const handleBulkMarkWatered = useCallback(() => {
        const duePlants = plants.filter(p => selectedIds.has(p.id));
        if (duePlants.length === 0) {
            return;
        }

        const count = duePlants.length;
        for (const plant of duePlants) {
            markWatered.mutate({ id: plant.id, nextWateringDate: computeNextWateringDate(plant) });
        }
        setSelectedIds(new Set());
        toast.success(`${count} plant${count !== 1 ? "s" : ""} marked as watered`);
    }, [plants, selectedIds, markWatered]);

    const handleAssignmentChange = useCallback(
        (plantId: string, userId: string | null) => {
            if (!household || !householdMembers) {
                return;
            }

            setPendingPlantId(plantId);

            // Find the current assignment for this plant
            const plant = plants.find(p => p.id === plantId);
            const currentAssignment = plant?.assignment;

            const member = userId ? householdMembers.find(m => m.userId === userId) : null;
            const userName = member?.userName ?? member?.userId ?? null;

            const onSettled = () => setPendingPlantId(null);

            if (userId === null && currentAssignment) {
                // Clear assignment: delete it
                deleteAssignment.mutate(currentAssignment.id, { onSettled });
            } else if (userId && currentAssignment) {
                // Update existing assignment
                updateAssignment.mutate({ id: currentAssignment.id, assignedUserId: userId, assignedUserName: userName }, { onSettled });
            } else if (userId) {
                // Create new assignment
                createAssignment.mutate(
                    { plantId, householdId: household.id, assignedUserId: userId, assignedUserName: userName ?? userId },
                    { onSettled }
                );
            }
        },
        [household, householdMembers, plants, createAssignment, updateAssignment, deleteAssignment]
    );

    const selectedCount = plants.filter(p => selectedIds.has(p.id)).length;

    const totalSize = virtualizer.getTotalSize();
    const virtualizerContainerStyle = useMemo(
        () => ({
            height: `${totalSize}px`,
            width: "100%",
            position: "relative" as const
        }),
        [totalSize]
    );

    if (isPending) {
        return (
            <div className="flex items-center justify-center p-12">
                <p className="text-muted-foreground text-sm">Loading plants...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center gap-2 p-12">
                <p className="text-destructive text-sm font-medium">Failed to load plants</p>
                <p className="text-muted-foreground text-xs">Please try refreshing the page.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-semibold tracking-tight">Today</h1>
                    <p className="text-muted-foreground text-sm">Plants that need your attention today</p>
                </div>
            </div>

            <FilterBar
                filters={filters}
                onFilterChange={updateFilter}
                onClear={clearFilters}
                hasActiveFilters={hasActiveFilters}
                showDueForWatering={false}
            />

            {selectedCount > 0 && (
                <div role="status" className="border-botanical/20 bg-botanical/10 flex items-center gap-3 rounded-lg border px-4 py-2">
                    <span className="text-sm font-medium">{selectedCount} selected</span>
                    <Button variant="default" size="xs" onClick={handleBulkMarkWatered}>
                        Mark selected as Watered
                    </Button>
                </div>
            )}

            <div role="status" aria-live="polite" className="text-muted-foreground text-sm font-medium">
                {plants.length} plant{plants.length !== 1 ? "s" : ""} due for watering
            </div>

            {isHouseholdView ? (
                <div className="flex flex-col gap-6">
                    <PlantSection
                        title="My tasks"
                        plants={myTasks}
                        selectedIds={selectedIds}
                        careEventsByPlant={careEventsByPlant}
                        onToggleSelect={toggleSelect}
                        onViewDetail={handleViewDetail}
                        householdMembers={householdMembers}
                        onAssignmentChange={handleAssignmentChange}
                        pendingPlantId={pendingPlantId}
                        emptyMessage="No tasks assigned to you right now."
                    />

                    <PlantSection
                        title="Others' tasks"
                        plants={othersTasks}
                        selectedIds={selectedIds}
                        careEventsByPlant={careEventsByPlant}
                        onToggleSelect={toggleSelect}
                        onViewDetail={handleViewDetail}
                        householdMembers={householdMembers}
                        onAssignmentChange={handleAssignmentChange}
                        pendingPlantId={pendingPlantId}
                    />

                    <PlantSection
                        title="Available"
                        plants={availableTasks}
                        selectedIds={selectedIds}
                        careEventsByPlant={careEventsByPlant}
                        onToggleSelect={toggleSelect}
                        onViewDetail={handleViewDetail}
                        householdMembers={householdMembers}
                        onAssignmentChange={handleAssignmentChange}
                        pendingPlantId={pendingPlantId}
                        emptyMessage="All tasks are assigned."
                    />
                </div>
            ) : plants.length === 0 ? (
                <div className="bg-card border-border/50 flex flex-col items-center justify-center gap-2 rounded-xl border p-12 shadow-sm">
                    <p className="text-muted-foreground text-sm font-medium">All caught up!</p>
                    <p className="text-muted-foreground text-xs">No plants need watering right now.</p>
                </div>
            ) : (
                <div className="bg-card border-border/50 overflow-hidden rounded-xl border shadow-sm">
                    <PlantListHeader selectAllChecked={allSelected} onToggleSelectAll={toggleAll} />
                    <div ref={listRef} role="list" aria-label="Plants due for watering" style={virtualizerContainerStyle}>
                        {virtualizer.getVirtualItems().map(virtualRow => {
                            const plant = plants[virtualRow.index]!;
                            // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- Virtual row positioning requires per-item inline styles
                            const rowStyle = {
                                position: "absolute" as const,
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`
                            };
                            return (
                                <div key={plant.id} role="listitem" style={rowStyle}>
                                    <PlantListItem
                                        plant={plant}
                                        selected={selectedIds.has(plant.id)}
                                        onToggleSelect={toggleSelect}
                                        onClick={handleViewDetail}
                                        recentCareEvent={careEventsByPlant.get(plant.id)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <PlantDetailDialog
                plant={detailPlant}
                open={detailPlant !== null}
                onOpenChange={handleDetailOpenChange}
                onMarkWatered={handleMarkWatered}
                isMarkingWatered={markWatered.isPending}
                recentCareEvent={detailRecentCareEvent}
            />
        </div>
    );
}
