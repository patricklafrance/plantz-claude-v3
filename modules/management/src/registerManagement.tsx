import type { FireflyRuntime } from "@squide/firefly";

import { registerManagementUser } from "./account/registerManagementUser.tsx";
import { registerManagementHousehold } from "./household/registerManagementHousehold.tsx";
import { registerManagementPlants } from "./inventory/registerManagementPlants.tsx";

export async function registerManagement(runtime: FireflyRuntime) {
    await registerManagementPlants(runtime);
    await registerManagementUser(runtime);
    await registerManagementHousehold(runtime);
}
