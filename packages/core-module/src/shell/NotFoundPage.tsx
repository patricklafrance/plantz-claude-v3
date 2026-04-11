export function NotFoundPage() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <h1 className="font-display text-primary text-6xl font-light tracking-tight">404</h1>
            <p className="text-muted-foreground text-lg">This page has wilted away.</p>
            <a href="/" className="text-primary hover:text-primary/80 text-sm underline underline-offset-4 transition-colors">
                Back to the greenhouse
            </a>
        </div>
    );
}
