import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

const toastOptions = {
    classNames: {
        toast: "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
        description: "group-[.toast]:text-muted-foreground",
        actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
        cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        success: "group-[.toaster]:!bg-botanical/10 group-[.toaster]:!text-botanical group-[.toaster]:!border-botanical/20",
        error: "group-[.toaster]:!bg-destructive/10 group-[.toaster]:!text-destructive group-[.toaster]:!border-destructive/20"
    }
} as const;

function Toaster(props: ToasterProps) {
    return <SonnerToaster className="toaster group" toastOptions={toastOptions} {...props} />;
}

export { Toaster };
