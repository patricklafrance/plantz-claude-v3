import type { FireflyRuntime } from "@squide/firefly";

import { registerTodayLandingPage } from "./today/registerTodayLandingPage.tsx";

export async function registerWatering(runtime: FireflyRuntime) {
    await registerTodayLandingPage(runtime);
}
