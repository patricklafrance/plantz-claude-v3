import type { FireflyRuntime } from "@squide/firefly";

function registerRoutes(runtime: FireflyRuntime) {
    runtime.registerRoute({
        path: "/management/household",
        lazy: async () => {
            const { HouseholdPage } = await import("./HouseholdPage.tsx");

            return {
                element: <HouseholdPage />
            };
        }
    });

    runtime.registerNavigationItem({
        $id: "management-household",
        $label: "Household",
        $priority: 80,
        to: "/management/household"
    });
}

export async function registerManagementHousehold(runtime: FireflyRuntime) {
    registerRoutes(runtime);

    if (runtime.isMswEnabled) {
        const { managementHouseholdHandlers } = await import("@packages/api/handlers/management");
        runtime.registerRequestHandlers(managementHouseholdHandlers);
    }
}
