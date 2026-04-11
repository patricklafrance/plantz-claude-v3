import type { FireflyRuntime } from "@squide/firefly";

function registerRoutes(runtime: FireflyRuntime) {
    runtime.registerRoute({
        path: "/profile",
        lazy: async () => {
            const { UserPage } = await import("./UserPage.tsx");

            return {
                element: <UserPage />
            };
        }
    });
}

export async function registerManagementUser(runtime: FireflyRuntime) {
    registerRoutes(runtime);

    if (runtime.isMswEnabled) {
        const { managementUserHandlers } = await import("@packages/api/handlers/management");
        runtime.registerRequestHandlers(managementUserHandlers);
    }
}
