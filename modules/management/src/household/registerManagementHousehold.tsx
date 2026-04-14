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
        const { householdHandlers, invitationHandlers } = await import("@packages/api/handlers/household");
        runtime.registerRequestHandlers([...householdHandlers, ...invitationHandlers]);
    }
}
