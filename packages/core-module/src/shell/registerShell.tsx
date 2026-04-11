import { PublicRoutes, ProtectedRoutes, type ModuleRegisterFunction, type FireflyRuntime } from "@squide/firefly";

import { NotFoundPage } from "./NotFoundPage.tsx";
import { RootLayout } from "./RootLayout.tsx";

export const registerShell: ModuleRegisterFunction<FireflyRuntime> = async runtime => {
    runtime.registerRoute(
        {
            element: <RootLayout />,
            children: [PublicRoutes, ProtectedRoutes]
        },
        { hoist: true }
    );

    runtime.registerPublicRoute({
        path: "/login",
        lazy: async () => {
            const { LoginPage } = await import("./LoginPage.tsx");

            return { element: <LoginPage /> };
        }
    });

    runtime.registerPublicRoute({
        path: "*",
        element: <NotFoundPage />
    });

    if (runtime.isMswEnabled) {
        const { authHandlers } = await import("@packages/api/handlers/auth");
        runtime.registerRequestHandlers(authHandlers);
    }
};
