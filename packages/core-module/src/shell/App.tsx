import { AppRouter, useIsActiveRouteProtected, useIsBootstrapping, useProtectedDataQueries } from "@squide/firefly";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { RouterProvider } from "react-router/dom";

import { AuthError } from "../AuthError.ts";
import { SessionProvider, sessionQueryOptions } from "../SessionContext.tsx";

function BootstrappingRoute() {
    const [session] = useProtectedDataQueries([sessionQueryOptions()], error => error instanceof AuthError && error.status === 401);

    const isActiveRouteProtected = useIsActiveRouteProtected(true, { throwWhenThereIsNoMatch: false });

    if (useIsBootstrapping()) {
        return (
            <div className="bg-background flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // On public routes (e.g. /login), render without requiring a session.
    if (!isActiveRouteProtected) {
        return <Outlet />;
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    return (
        <SessionProvider session={session}>
            <Outlet />
        </SessionProvider>
    );
}

export function App() {
    return (
        <AppRouter waitForProtectedData>
            {({ rootRoute, registeredRoutes, routerProps, routerProviderProps }) => (
                <RouterProvider
                    router={createBrowserRouter(
                        [
                            {
                                element: rootRoute,
                                children: [
                                    {
                                        element: <BootstrappingRoute />,
                                        children: registeredRoutes
                                    }
                                ]
                            }
                        ],
                        routerProps
                    )}
                    {...routerProviderProps}
                />
            )}
        </AppRouter>
    );
}
