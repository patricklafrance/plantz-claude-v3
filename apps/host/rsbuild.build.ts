import { defineBuildConfig, type RsbuildConfigTransformer } from "@workleap/rsbuild-configs";

// @opentelemetry/api is an optional peer dependency of @squide/firefly (used only by Honeycomb instrumentation).
// Ignore it so the bundler doesn't fail when it's not installed.
const ignoreOptionalPeerDeps: RsbuildConfigTransformer = config => {
    config.tools ??= {};
    config.tools.rspack ??= {};

    const rspack = config.tools.rspack as Record<string, unknown>;
    rspack.resolve ??= {};
    (rspack.resolve as Record<string, unknown>).fallback ??= {};
    ((rspack.resolve as Record<string, unknown>).fallback as Record<string, false>)["@opentelemetry/api"] = false;

    return config;
};

const tailwindPostCss: RsbuildConfigTransformer = config => {
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
    environmentVariables: {
        MODULES: process.env.MODULES ?? ""
    },
    transformers: [ignoreOptionalPeerDeps, tailwindPostCss]
});
