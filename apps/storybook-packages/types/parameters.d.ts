import type { A11yParameters } from "@storybook/addon-a11y";

declare module "@storybook/react-vite" {
    interface Parameters {
        chromatic?: {
            diffThreshold?: number;
            delay?: number;
            forcedColors?: "none" | "active";
            pauseAnimationAtEnd?: boolean;
            disableSnapshot?: boolean;
            ignoreSelectors?: string[];
            prefersReducedMotion?: "no-preference" | "reduce";
            media?: "print";
            modes?: Record<
                string,
                {
                    /** Disable a mode set in a meta tag or in the storybook's preview. */
                    disable?: boolean;
                } & {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    [key: string]: any;
                }
            >;
        };
    }
}
