import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Plus } from "lucide-react";
import { useState, useRef, useMemo, useCallback } from "react";

import type { Plant } from "@packages/api/entities/plants";
import { Button, toast } from "@packages/components";

import { CreatePlantDialog } from "./CreatePlantDialog.tsx";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog.tsx";
import { EditPlantDialog } from "./EditPlantDialog.tsx";
import { FilterBar } from "./FilterBar.tsx";
import { PlantListHeader } from "./PlantListHeader.tsx";
import { PlantListItem } from "./PlantListItem.tsx";
import { applyPlantFilters } from "./plantUtils.ts";
import { useManagementPlants, useDeletePlant, useDeletePlants } from "./useManagementPlants.ts";
import { usePlantFilters } from "./usePlantFilters.ts";

export function PlantsPage() {
    const { filters, updateFilter, clearFilters, hasActiveFilters } = usePlantFilters();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [createOpen, setCreateOpen] = useState(false);
    const [editPlant, setEditPlant] = useState<Plant | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Plant[] | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const { data: allPlants, isPending, isError } = useManagementPlants();
    const deletePlantMutation = useDeletePlant();
    const deletePlantsMutation = useDeletePlants();

    const plants = useMemo(() => {
        if (!allPlants) {
            return [];
        }
        const sorted = allPlants.toSorted((a, b) => a.name.localeCompare(b.name));

        return applyPlantFilters(sorted, filters);
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

    const handleDeleteSingle = useCallback((plant: Plant) => {
        setDeleteTarget([plant]);
    }, []);

    const handleBulkDelete = useCallback(() => {
        const selected = plants.filter(p => selectedIds.has(p.id));
        if (selected.length > 0) {
            setDeleteTarget(selected);
        }
    }, [plants, selectedIds]);

    const confirmDelete = useCallback(() => {
        if (!deleteTarget) {
            return;
        }
        const ids = deleteTarget.map(p => p.id);
        const count = ids.length;
        const label = count === 1 ? deleteTarget[0]!.name : `${count} plants`;
        if (count === 1) {
            deletePlantMutation.mutate(ids[0]!, {
                onSuccess: () => toast.success(`${label} deleted`),
                onError: () => toast.error(`Failed to delete ${label}`)
            });
        } else {
            deletePlantsMutation.mutate(ids, {
                onSuccess: () => toast.success(`${label} deleted`),
                onError: () => toast.error(`Failed to delete ${label}`)
            });
        }
        setSelectedIds(prev => {
            const next = new Set(prev);
            for (const plant of deleteTarget) {
                next.delete(plant.id);
            }
            return next;
        });
        if (editOpen && editPlant && deleteTarget.some(p => p.id === editPlant.id)) {
            setEditOpen(false);
            setEditPlant(null);
        }
        setDeleteTarget(null);
    }, [deleteTarget, editOpen, editPlant, deletePlantMutation, deletePlantsMutation]);

    const handleEditFromDialog = useCallback(
        (plant: Plant) => {
            setEditOpen(false);
            setEditPlant(null);
            handleDeleteSingle(plant);
        },
        [handleDeleteSingle]
    );

    const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

    const handleEditPlant = useCallback((plant: Plant) => {
        setEditPlant(plant);
        setEditOpen(true);
    }, []);

    const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
        if (!open) {
            setDeleteTarget(null);
        }
    }, []);

    const handleMarkWatered = useCallback((_plant: Plant) => {
        setEditOpen(false);
        setEditPlant(null);
    }, []);

    const handleBulkMarkWatered = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const selectedCount = plants.filter(p => selectedIds.has(p.id)).length;

    const deleteTargetNames = useMemo(() => deleteTarget?.map(p => p.name) ?? [], [deleteTarget]);

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
                <h1 className="font-display text-2xl tracking-tight">Plants</h1>
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={handleOpenCreate}>
                        <Plus data-icon="inline-start" />
                        New plant
                    </Button>
                </div>
            </div>

            <FilterBar filters={filters} onFilterChange={updateFilter} onClear={clearFilters} hasActiveFilters={hasActiveFilters} />

            {selectedCount > 0 && (
                <div role="status" className="border-botanical/20 bg-botanical/10 flex items-center gap-3 rounded-lg border px-4 py-2">
                    <span className="text-sm font-medium">{selectedCount} selected</span>
                    <Button variant="default" size="xs" onClick={handleBulkMarkWatered}>
                        Mark selected as Watered
                    </Button>
                    <Button variant="destructive" size="xs" onClick={handleBulkDelete}>
                        Delete selected
                    </Button>
                </div>
            )}

            <div role="status" aria-live="polite" className="text-muted-foreground text-sm font-medium">
                {plants.length} plant{plants.length !== 1 ? "s" : ""}
            </div>

            {plants.length === 0 ? (
                <div className="bg-card border-border/50 flex flex-col items-center justify-center gap-2 rounded-xl border p-12 shadow-sm">
                    <p className="text-muted-foreground text-sm font-medium">No plants yet</p>
                    <p className="text-muted-foreground text-xs">Add your first plant to get started.</p>
                </div>
            ) : (
                <div className="bg-card border-border/50 overflow-hidden rounded-xl border shadow-sm">
                    <PlantListHeader selectAllChecked={allSelected} onToggleSelectAll={toggleAll} />
                    <div ref={listRef} role="list" aria-label="Plants" style={virtualizerContainerStyle}>
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
                                        onEdit={handleEditPlant}
                                        onDelete={handleDeleteSingle}
                                        onMarkWatered={handleMarkWatered}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <CreatePlantDialog open={createOpen} onOpenChange={setCreateOpen} />
            <EditPlantDialog
                plant={editPlant}
                open={editOpen}
                onOpenChange={setEditOpen}
                onDelete={handleEditFromDialog}
                onMarkWatered={handleMarkWatered}
            />
            <DeleteConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={handleDeleteDialogOpenChange}
                plantNames={deleteTargetNames}
                onConfirm={confirmDelete}
            />
        </div>
    );
}
