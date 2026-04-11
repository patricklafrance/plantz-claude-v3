import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@packages/components";

interface DeleteConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    plantNames: string[];
    onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, onOpenChange, plantNames, onConfirm }: DeleteConfirmDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="font-display tracking-tight">
                        Delete {plantNames.length === 1 ? "plant" : "plants"}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {plantNames.length === 1
                            ? `Are you sure you want to delete "${plantNames[0]}"? This action cannot be undone.`
                            : `Are you sure you want to delete ${plantNames.length} plants? This action cannot be undone.`}
                    </AlertDialogDescription>
                    {plantNames.length > 1 && (
                        <div className="bg-secondary/30 mt-2 max-h-32 overflow-y-auto rounded-lg p-3">
                            <ul className="text-muted-foreground w-full min-w-0 text-sm">
                                {plantNames.map(name => (
                                    <li key={name} className="truncate">
                                        {name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={onConfirm}>
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
