import type { FireflyRuntime } from "@squide/firefly";

const lazy = async () => {
    const { LandingPage } = await import("./LandingPage.tsx");

    return {
        element: <LandingPage />
    };
};

function registerRoutes(runtime: FireflyRuntime) {
    runtime.registerRoute({
        index: true,
        lazy
    });

    runtime.registerRoute({
        path: "/today",
        lazy
    });

    runtime.registerNavigationItem({
        $id: "today-landing-page",
        $label: "Today",
        $priority: 100,
        to: "/today"
    });
}

export async function registerTodayLandingPage(runtime: FireflyRuntime) {
    registerRoutes(runtime);

    if (runtime.isMswEnabled) {
        const { todayPlantHandlers, todayCareEventHandlers, todayAssignmentHandlers } = await import("@packages/api/handlers/today");
        runtime.registerRequestHandlers(todayPlantHandlers);
        runtime.registerRequestHandlers(todayCareEventHandlers);
        runtime.registerRequestHandlers(todayAssignmentHandlers);
    }
}
