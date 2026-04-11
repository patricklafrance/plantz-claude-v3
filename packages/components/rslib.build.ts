import path from "node:path";

import type { RslibConfig } from "@rslib/core";
import { defineBuildConfig, type RslibConfigTransformer } from "@workleap/rslib-configs";

const tailwindPostCss: RslibConfigTransformer = (config: RslibConfig) => {
    config.tools ??= {};
    config.tools.postcss ??= {};

    const postcss = config.tools.postcss as Record<string, unknown>;
    postcss.postcssOptions ??= {};

    const postcssOptions = postcss.postcssOptions as Record<string, unknown>;
    postcssOptions.plugins ??= [];

    (postcssOptions.plugins as unknown[]).push(["@tailwindcss/postcss", {}]);

    return config;
};

export default defineBuildConfig({
    tsconfigPath: path.resolve("./tsconfig.build.json"),
    react: true,
    transformers: [tailwindPostCss]
});
