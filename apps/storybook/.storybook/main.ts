import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);

const storybookConfig: StorybookConfig = {
    framework: getAbsolutePath("@storybook/react-vite"),
    addons: [getAbsolutePath("@storybook/addon-a11y"), getAbsolutePath("@storybook/addon-themes"), getAbsolutePath("@storybook/addon-vitest")],
    stories: [
        // Packages
        "../../../packages/components/src/**/*.stories.tsx",
        "../../../packages/core-module/src/**/*.stories.tsx",
        // Management
        "../../../modules/management/src/inventory/**/*.stories.tsx",
        "../../../modules/management/src/account/**/*.stories.tsx",
        // Watering
        "../../../modules/watering/src/today/**/*.stories.tsx"
    ],
    staticDirs: ["./public"]
};

export default storybookConfig;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAbsolutePath(value: string): any {
    return dirname(require.resolve(join(value, "package.json")));
}
