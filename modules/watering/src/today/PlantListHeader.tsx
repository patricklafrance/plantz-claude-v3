import { Checkbox } from "@packages/components";

import { PLANT_LIST_GRID } from "./plantListLayout.ts";

interface PlantListHeaderProps {
    selectAllChecked?: boolean | undefined;
    onToggleSelectAll?: (() => void) | undefined;
}

export function PlantListHeader({ selectAllChecked = false, onToggleSelectAll }: PlantListHeaderProps) {
    return (
        <div className={`bg-secondary/60 border-border items-center gap-3 border-b px-5 py-2 ${PLANT_LIST_GRID}`}>
            <div className="flex items-center justify-center">
                {onToggleSelectAll ? (
                    <Checkbox checked={selectAllChecked} onCheckedChange={onToggleSelectAll} aria-label="Select all plants" />
                ) : (
                    <span className="w-4" />
                )}
            </div>
            <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Name</span>
            <span className="text-muted-foreground hidden text-xs font-semibold tracking-wider uppercase md:block">Qty</span>
            <span className="text-muted-foreground hidden text-xs font-semibold tracking-wider uppercase md:block">Type</span>
            <span className="text-muted-foreground hidden text-xs font-semibold tracking-wider uppercase md:block">Location</span>
            <span className="text-muted-foreground hidden text-xs font-semibold tracking-wider uppercase md:block">Mist</span>
        </div>
    );
}
