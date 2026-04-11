import type { FireflyRuntime } from "@squide/firefly";

function registerRoutes(runtime: FireflyRuntime) {
    runtime.registerRoute({
        path: "/management/plants",
        lazy: async () => {
            const { PlantsPage } = await import("./PlantsPage.tsx");

            return {
                element: <PlantsPage />
            };
        }
    });

    runtime.registerNavigationItem({
        $id: "management-plants",
        $label: "My Plants",
        $priority: 90,
        to: "/management/plants"
    });
}

export async function registerManagementPlants(runtime: FireflyRuntime) {
    registerRoutes(runtime);

    if (runtime.isMswEnabled) {
        const { managementPlantHandlers } = await import("@packages/api/handlers/management");
        runtime.registerRequestHandlers(managementPlantHandlers);
    }
}
