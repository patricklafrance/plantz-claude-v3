import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    // Workaround: pre-optimize React JSX deps to prevent Vite reload mid-test in CI.
    // https://github.com/storybookjs/storybook/issues/32049
    // Remove when Storybook ships #33875 (preview annotations as optimizer entries).
    optimizeDeps: {
        include: ["react/jsx-dev-runtime", "react/jsx-runtime", "msw", "msw/browser"]
    },
    plugins: [
        storybookTest({
            configDir: path.join(dirname, ".storybook")
        })
    ],
    test: {
        name: "storybook-watering",
        globalSetup: ["./vitest.globalSetup.ts"],
        browser: {
            enabled: true,
            // @ts-expect-error — tsgo resolves duplicate vitest types from different @opentelemetry peer paths
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }]
        },
        setupFiles: ["./.storybook/vitest.setup.ts"]
    }
});
