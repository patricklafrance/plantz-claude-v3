import { useState, type FormEvent } from "react";

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
import { useCreatePlant } from "./useManagementPlants.ts";

interface CreatePlantDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultFirstWateringDate?: Date;
}

function tomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function CreatePlantDialog({ open, onOpenChange, defaultFirstWateringDate }: CreatePlantDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [family, setFamily] = useState("");
    const [location, setLocation] = useState("living-room");
    const [luminosity, setLuminosity] = useState("medium");
    const [mistLeaves, setMistLeaves] = useState(true);
    const [soilType, setSoilType] = useState("");
    const [wateringFrequency, setWateringFrequency] = useState("1-week");
    const [wateringQuantity, setWateringQuantity] = useState("");
    const [wateringType, setWateringType] = useState("surface");
    const [firstWateringDate, setFirstWateringDate] = useState<Date | undefined>(defaultFirstWateringDate ?? tomorrow());

    const createPlant = useCreatePlant();

    const isValid = name.trim() !== "" && wateringQuantity.trim() !== "" && firstWateringDate !== undefined;

    function resetForm() {
        setName("");
        setDescription("");
        setFamily("");
        setLocation("living-room");
        setLuminosity("medium");
        setMistLeaves(true);
        setSoilType("");
        setWateringFrequency("1-week");
        setWateringQuantity("");
        setWateringType("surface");
        setFirstWateringDate(defaultFirstWateringDate ?? tomorrow());
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!isValid) {
            return;
        }

        createPlant.mutate({
            name: name.trim(),
            description: description.trim() || undefined,
            family: family.trim() || undefined,
            location,
            luminosity,
            mistLeaves,
            isShared: false,
            soilType: soilType.trim() || undefined,
            wateringFrequency,
            wateringQuantity: wateringQuantity.trim(),
            wateringType,
            nextWateringDate: firstWateringDate!
        });

        resetForm();
        onOpenChange(false);
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            resetForm();
        }
        onOpenChange(nextOpen);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-display tracking-tight">New plant</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* About */}
                    <fieldset className="flex flex-col gap-3">
                        <legend className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">About</legend>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="create-name">Name *</Label>
                            <Input
                                id="create-name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Plant name"
                                aria-required="true"
                                aria-invalid={name.trim() === "" && name !== ""}
                                aria-describedby={name.trim() === "" && name !== "" ? "create-name-error" : undefined}
                            />
                            {name.trim() === "" && name !== "" && (
                                <p id="create-name-error" role="alert" className="text-destructive text-xs">
                                    Name is required.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="create-description">Description</Label>
                            <Textarea
                                id="create-description"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Optional description"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="create-family">Family</Label>
                            <Input id="create-family" value={family} onChange={e => setFamily(e.target.value)} placeholder="Plant family" />
                        </div>
                    </fieldset>

                    <Separator />

                    {/* Environment */}
                    <fieldset className="flex flex-col gap-3">
                        <legend className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">Environment</legend>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="create-location">Location *</Label>
                                <Select
                                    value={location}
                                    onValueChange={v => {
                                        if (v) {
                                            setLocation(v);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="create-location" className="w-full" aria-required="true">
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
                                <Label htmlFor="create-luminosity">Luminosity *</Label>
                                <Select
                                    value={luminosity}
                                    onValueChange={v => {
                                        if (v) {
                                            setLuminosity(v);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="create-luminosity" className="w-full" aria-required="true">
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
                            <Label htmlFor="create-mist">Mist leaves *</Label>
                            <Switch id="create-mist" checked={mistLeaves} onCheckedChange={setMistLeaves} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="create-soil">Soil type</Label>
                            <Input id="create-soil" value={soilType} onChange={e => setSoilType(e.target.value)} placeholder="Soil type" />
                        </div>
                    </fieldset>

                    <Separator />

                    {/* Watering */}
                    <fieldset className="flex flex-col gap-3">
                        <legend className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">Watering</legend>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="create-watering-frequency">Frequency *</Label>
                                <Select
                                    value={wateringFrequency}
                                    onValueChange={v => {
                                        if (v) {
                                            setWateringFrequency(v);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="create-watering-frequency" className="w-full" aria-required="true">
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
                                <Label htmlFor="create-watering-type">Type *</Label>
                                <Select
                                    value={wateringType}
                                    onValueChange={v => {
                                        if (v) {
                                            setWateringType(v);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="create-watering-type" className="w-full" aria-required="true">
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
                            <Label htmlFor="create-quantity">Quantity *</Label>
                            <Input
                                id="create-quantity"
                                value={wateringQuantity}
                                onChange={e => setWateringQuantity(e.target.value)}
                                placeholder="e.g. 200ml"
                                aria-required="true"
                                aria-invalid={wateringQuantity.trim() === "" && wateringQuantity !== ""}
                                aria-describedby={wateringQuantity.trim() === "" && wateringQuantity !== "" ? "create-quantity-error" : undefined}
                            />
                            {wateringQuantity.trim() === "" && wateringQuantity !== "" && (
                                <p id="create-quantity-error" role="alert" className="text-destructive text-xs">
                                    Watering quantity is required.
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label>First watering date *</Label>
                            <DatePicker
                                value={firstWateringDate}
                                onChange={setFirstWateringDate}
                                placeholder="Pick a date"
                                aria-label="First watering date"
                            />
                        </div>
                    </fieldset>

                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!isValid}>
                            Create plant
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
