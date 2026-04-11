import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useState, useRef, useMemo, useCallback } from "react";

import type { Plant } from "@packages/api/entities/plants";
import { getFrequencyDays } from "@packages/api/entities/plants";
import { Button, toast } from "@packages/components";

import { FilterBar } from "./FilterBar.tsx";
import { PlantDetailDialog } from "./PlantDetailDialog.tsx";
import { PlantListHeader } from "./PlantListHeader.tsx";
import { PlantListItem } from "./PlantListItem.tsx";
import { applyPlantFilters, isDueForWatering } from "./plantUtils.ts";
import { usePlantFilters } from "./usePlantFilters.ts";
import { useTodayPlants, useMarkWatered } from "./useTodayPlants.ts";

function computeNextWateringDate(plant: Plant): Date {
    const days = getFrequencyDays(plant.wateringFrequency);
    const next = new Date();
    next.setDate(next.getDate() + days);
    next.setHours(0, 0, 0, 0);

    return next;
}

export function LandingPage() {
    const { filters, updateFilter, clearFilters, hasActiveFilters } = usePlantFilters();
    const [detailPlant, setDetailPlant] = useState<Plant | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const listRef = useRef<HTMLDivElement>(null);

    const { data: allPlants, isPending, isError } = useTodayPlants();
    const markWatered = useMarkWatered();

    const plants = useMemo(() => {
        if (!allPlants) {
            return [];
        }

        // First sort by name, then filter to only plants due for watering, then apply user filters
        const sorted = allPlants.toSorted((a, b) => a.name.localeCompare(b.name));
        const duePlants = sorted.filter(p => isDueForWatering(p));

        return applyPlantFilters(duePlants, filters);
    }, [allPlants, filters]);

    const virtualizer = useWindowVirtualizer({
        count: plants.length,
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

            {plants.length === 0 ? (
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
            />
        </div>
    );
}
