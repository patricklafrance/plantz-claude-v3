import { format } from "date-fns";
import { Droplets, Trash2 } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

import type { Plant } from "@packages/api/entities/plants";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Button,
    Input,
    Textarea,
    Label,
    Switch,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    DatePicker,
    Separator
} from "@packages/components";

import { locations, luminosities, wateringFrequencies, wateringTypes } from "./constants.ts";
import { useHouseholdMe } from "./useHouseholdMe.ts";
import { useUpdatePlant } from "./useManagementPlants.ts";

interface EditPlantDialogProps {
    plant: Plant | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (plant: Plant) => void;
    onMarkWatered?: (plant: Plant) => void;
    /** @internal Test-only. Pre-sets sharing state to skip async resolution. */
    _defaultSharing?: boolean;
}

export function EditPlantDialog({ plant, open, onOpenChange, onDelete, onMarkWatered, _defaultSharing }: EditPlantDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [family, setFamily] = useState("");
    const [location, setLocation] = useState("");
    const [luminosity, setLuminosity] = useState("");
    const [mistLeaves, setMistLeaves] = useState(false);
    const [soilType, setSoilType] = useState("");
    const [wateringFrequency, setWateringFrequency] = useState("");
    const [wateringQuantity, setWateringQuantity] = useState("");
    const [wateringType, setWateringType] = useState("");
    const [isShared, setIsShared] = useState(_defaultSharing ?? false);
    const [saved, setSaved] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const plantIdRef = useRef<string | null>(null);

    const updatePlant = useUpdatePlant();
    const { data: householdData } = useHouseholdMe();

    useEffect(() => {
        if (plant) {
            plantIdRef.current = plant.id;
            setName(plant.name);
            setDescription(plant.description ?? "");
            setFamily(plant.family ?? "");
            setLocation(plant.location);
            setLuminosity(plant.luminosity);
            setMistLeaves(plant.mistLeaves);
            setSoilType(plant.soilType ?? "");
            setWateringFrequency(plant.wateringFrequency);
            setWateringQuantity(plant.wateringQuantity);
            setWateringType(plant.wateringType);
            setIsShared(_defaultSharing ?? !!plant.householdId);
            setSaved(false);
        }
    }, [plant, _defaultSharing]);

    const saveChanges = useCallback(() => {
        if (!plantIdRef.current) {
            return;
        }
        if (!name.trim() || !wateringQuantity.trim()) {
            return;
        }

        updatePlant.mutate(
            {
                id: plantIdRef.current,
                name: name.trim(),
                description: description.trim() || undefined,
                family: family.trim() || undefined,
                location,
                luminosity,
                mistLeaves,
                soilType: soilType.trim() || undefined,
                wateringFrequency,
                wateringQuantity: wateringQuantity.trim(),
                wateringType,
                householdId: isShared && householdData ? householdData.id : null
            },
            {
                onSuccess: () => {
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                }
            }
        );
    }, [
        name,
        description,
        family,
        location,
        luminosity,
        mistLeaves,
        soilType,
        wateringFrequency,
        wateringQuantity,
        wateringType,
        isShared,
        householdData,
        updatePlant
    ]);

    useEffect(() => {
        if (!plant || !open) {
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            saveChanges();
        }, 500);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [
        name,
        description,
        family,
        location,
        luminosity,
        mistLeaves,
        soilType,
        wateringFrequency,
        wateringQuantity,
        wateringType,
        isShared,
        plant,
        open,
        saveChanges
    ]);

    if (!plant) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <DialogTitle className="font-display tracking-tight">Edit plant</DialogTitle>
                        <span
                            role="status"
                            aria-live="polite"
                            className={`text-botanical text-xs transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
                        >
                            Saved
                        </span>
                    </div>
                </DialogHeader>
                <div className="flex flex-col gap-5">
                    {/* About */}
                    <fieldset className="flex flex-col gap-3">
                        <legend className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">About</legend>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-name">Name *</Label>
                            <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea id="edit-description" value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-family">Family</Label>
                            <Input id="edit-family" value={family} onChange={e => setFamily(e.target.value)} />
                        </div>
                    </fieldset>

                    <Separator />

                    {/* Environment */}
                    <fieldset className="flex flex-col gap-3">
                        <legend className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">Environment</legend>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="edit-location">Location *</Label>
                                <Select
                                    value={location}
                                    onValueChange={v => {
                                        if (v) {
                                            setLocation(v);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="edit-location" className="w-full" aria-required="true">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {locations.map(l => (
                                                <SelectItem key={l.id} value={l.id}>
                                                    {l.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="edit-luminosity">Luminosity *</Label>
                                <Select
                                    value={luminosity}
                                    onValueChange={v => {
                                        if (v) {
                                            setLuminosity(v);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="edit-luminosity" className="w-full" aria-required="true">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {luminosities.map(l => (
                                                <SelectItem key={l.id} value={l.id}>
                                                    {l.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label htmlFor="edit-mist">Mist leaves *</Label>
                            <Switch id="edit-mist" checked={mistLeaves} onCheckedChange={setMistLeaves} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-soil">Soil type</Label>
                            <Input id="edit-soil" value={soilType} onChange={e => setSoilType(e.target.value)} />
                        </div>
                    </fieldset>

                    <Separator />

                    {/* Watering */}
                    <fieldset className="flex flex-col gap-3">
                        <legend className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">Watering</legend>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="edit-watering-frequency">Frequency *</Label>
                                <Select
                                    value={wateringFrequency}
                                    onValueChange={v => {
                                        if (v) {
                                            setWateringFrequency(v);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="edit-watering-frequency" className="w-full" aria-required="true">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {wateringFrequencies.map(f => (
                                                <SelectItem key={f.id} value={f.id}>
                                                    {f.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="edit-watering-type">Type *</Label>
                                <Select
                                    value={wateringType}
                                    onValueChange={v => {
                                        if (v) {
                                            setWateringType(v);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="edit-watering-type" className="w-full" aria-required="true">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {wateringTypes.map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="edit-quantity">Quantity *</Label>
                            <Input id="edit-quantity" value={wateringQuantity} onChange={e => setWateringQuantity(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>Next watering date</Label>
                            <DatePicker value={plant.nextWateringDate} disabled aria-label="Next watering date" />
                        </div>
                    </fieldset>

                    {householdData && (
                        <>
                            <Separator />

                            {/* Sharing */}
                            <fieldset className="flex flex-col gap-3">
                                <legend className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">Sharing</legend>
                                <div className="flex items-center gap-3">
                                    <Label htmlFor="edit-sharing">Share with household</Label>
                                    <Switch id="edit-sharing" checked={isShared} onCheckedChange={setIsShared} />
                                </div>
                            </fieldset>
                        </>
                    )}

                    <p className="text-muted-foreground text-xs">
                        Created {format(plant.creationDate, "PPP")} · Updated {format(plant.lastUpdateDate, "PPP")}
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="sm:mr-auto"
                        onClick={() => {
                            if (plant) {
                                onDelete(plant);
                            }
                        }}
                    >
                        <Trash2 data-icon="inline-start" aria-hidden="true" />
                        Delete
                    </Button>
                    {onMarkWatered && (
                        <Button variant="outline" size="sm" onClick={() => onMarkWatered(plant)}>
                            <Droplets data-icon="inline-start" aria-hidden="true" />
                            Mark as Watered
                        </Button>
                    )}
                    <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
