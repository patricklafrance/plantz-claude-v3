import type { ModuleRegisterFunction, FireflyRuntime } from "@squide/firefly";

import { registerManagement } from "@modules/management";
import { registerWatering } from "@modules/watering";

interface ModuleEntry {
    register: (runtime: FireflyRuntime) => Promise<void>;
}

const ModuleRegistry: Record<string, ModuleEntry> = {
    management: { register: registerManagement },
    watering: { register: registerWatering }
};

export function getActiveModules(filter: string | undefined): ModuleRegisterFunction<FireflyRuntime>[] {
    const keys = filter
        ? filter
              .split(",")
              .map(m => m.trim())
              .filter(m => {
                  if (!ModuleRegistry[m]) {
                      // oxlint-disable-next-line eslint/no-console -- Runtime warning for misconfigured MODULES env var
                      console.warn(`[host] Unknown module "${m}". Available: ${Object.keys(ModuleRegistry).join(", ")}`);
                      return false;
                  }
                  return true;
              })
        : Object.keys(ModuleRegistry);

    return keys.map(key => {
        const entry = ModuleRegistry[key];

        return ((runtime: FireflyRuntime) => entry.register(runtime)) as ModuleRegisterFunction<FireflyRuntime>;
    });
}
