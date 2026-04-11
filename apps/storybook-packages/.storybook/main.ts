import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type { StorybookConfig } from "@storybook/react-vite";

const require = createRequire(import.meta.url);

const storybookConfig: StorybookConfig = {
    framework: getAbsolutePath("@storybook/react-vite"),
    addons: [getAbsolutePath("@storybook/addon-a11y"), getAbsolutePath("@storybook/addon-themes"), getAbsolutePath("@storybook/addon-vitest")],
    stories: ["../../../packages/components/src/**/*.stories.tsx", "../../../packages/core-module/src/**/*.stories.tsx"],
    staticDirs: ["./public"]
};

export default storybookConfig;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAbsolutePath(value: string): any {
    return dirname(require.resolve(join(value, "package.json")));
}
