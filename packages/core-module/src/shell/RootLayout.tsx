import {
    useNavigationItems,
    useRenderedNavigationItems,
    useIsActiveRouteProtected,
    isNavigationLink,
    type RenderItemFunction,
    type RenderSectionFunction
} from "@squide/firefly";
import { Link, Outlet } from "react-router";

import { Toaster } from "@packages/components";

import { PlantzLogo } from "./PlantzLogo.tsx";
import { UserMenu } from "./UserMenu.tsx";

const renderItem: RenderItemFunction = (item, key) => {
    if (!isNavigationLink(item)) {
        return null;
    }

    const { label, linkProps, additionalProps } = item;

    return (
        <li key={key}>
            <Link
                {...linkProps}
                {...additionalProps}
                className="text-muted-foreground hover:text-foreground font-body text-sm underline-offset-4 transition-colors hover:underline"
            >
                {label}
            </Link>
        </li>
    );
};

const renderSection: RenderSectionFunction = (elements, key) => (
    <ul key={key} className="flex items-center gap-4">
        {elements}
    </ul>
);

export function RootLayout() {
    const navigationItems = useNavigationItems();
    const navigationElements = useRenderedNavigationItems(navigationItems, renderItem, renderSection);
    const isActiveRouteProtected = useIsActiveRouteProtected(true, { throwWhenThereIsNoMatch: false });

    if (!isActiveRouteProtected) {
        return (
            <main className="text-foreground flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,var(--botanical)_0%,var(--background)_50%)] opacity-95">
                <Outlet />
                <Toaster position="bottom-right" />
            </main>
        );
    }

    return (
        <div className="bg-background text-foreground flex min-h-screen flex-col">
            <a
                href="#main-content"
                className="focus:bg-background sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
            >
                Skip to main content
            </a>
            <header className="bg-card flex items-center gap-6 px-8 py-4 shadow-sm">
                <Link to="/" aria-label="Plantz home">
                    <PlantzLogo className="text-foreground h-7 w-auto" />
                </Link>
                <nav aria-label="Main" className="flex-1">
                    {navigationElements}
                </nav>
                <UserMenu />
            </header>
            <main id="main-content" className="flex-1">
                <Outlet />
            </main>
            <Toaster position="bottom-right" />
        </div>
    );
}
