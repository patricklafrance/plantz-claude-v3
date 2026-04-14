import { format, formatDistanceToNow } from "date-fns";
import { Droplets, Loader2 } from "lucide-react";

import type { CareEvent } from "@packages/api/entities/care-events";
import type { Plant } from "@packages/api/entities/plants";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Separator } from "@packages/components";

import { locations, luminosities, wateringFrequencies, wateringTypes } from "./constants.ts";
import { getOptionLabel } from "./plantUtils.ts";

interface PlantDetailDialogProps {
    plant: Plant | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMarkWatered?: () => void;
    isMarkingWatered?: boolean;
    recentCareEvent?: CareEvent | null;
}

function DetailField({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
            <dd className="text-sm">{value}</dd>
        </div>
    );
}

export function PlantDetailDialog({ plant, open, onOpenChange, onMarkWatered, isMarkingWatered, recentCareEvent }: PlantDetailDialogProps) {
    if (!plant) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-display tracking-tight">{plant.name}</DialogTitle>
                    {plant.description && <p className="text-muted-foreground text-sm">{plant.description}</p>}
                    {plant.family && <p className="text-muted-foreground text-xs">Family: {plant.family}</p>}
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <section>
                        <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Environment</h3>
                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <DetailField label="Location" value={getOptionLabel(locations, plant.location)} />
                            <DetailField label="Luminosity" value={getOptionLabel(luminosities, plant.luminosity)} />
                            <DetailField label="Mist leaves" value={plant.mistLeaves ? "Yes" : "No"} />
                            {plant.soilType && <DetailField label="Soil type" value={plant.soilType} />}
                        </dl>
                    </section>

                    <Separator />

                    <section>
                        <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">Watering schedule</h3>
                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <DetailField label="Frequency" value={getOptionLabel(wateringFrequencies, plant.wateringFrequency)} />
                            <DetailField label="Type" value={getOptionLabel(wateringTypes, plant.wateringType)} />
                            <DetailField label="Quantity" value={plant.wateringQuantity} />
                            <DetailField label="Next watering" value={format(plant.nextWateringDate, "PPP")} />
                        </dl>
                    </section>

                    {recentCareEvent && (
                        <>
                            <Separator />

                            <section>
                                <p className="text-muted-foreground text-sm">
                                    Watered by {recentCareEvent.actorName} {formatDistanceToNow(recentCareEvent.timestamp, { addSuffix: true })}
                                </p>
                            </section>
                        </>
                    )}

                    <Separator />

                    <p className="text-muted-foreground text-xs">
                        Created {format(plant.creationDate, "PPP")} · Updated {format(plant.lastUpdateDate, "PPP")}
                    </p>
                </div>

                <DialogFooter showCloseButton>
                    {onMarkWatered && (
                        <Button
                            variant="default"
                            className="bg-botanical text-botanical-foreground hover:bg-botanical/90 sm:mr-auto"
                            onClick={onMarkWatered}
                            disabled={isMarkingWatered}
                        >
                            {isMarkingWatered ? (
                                <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
                            ) : (
                                <Droplets data-icon="inline-start" aria-hidden="true" />
                            )}
                            {isMarkingWatered ? "Watering..." : "Mark as Watered"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
