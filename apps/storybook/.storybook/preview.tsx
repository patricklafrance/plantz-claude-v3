import "./storybook.css";
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";

initialize({ onUnhandledRequest: "bypass", quiet: true });

const preview: Preview = {
    initialGlobals: {
        theme: import.meta.env.STORYBOOK_THEME || "light"
    },
    decorators: [
        withThemeByClassName({
            themes: {
                light: "",
                dark: "dark"
            },
            defaultTheme: "light",
            parentSelector: "html"
        })
    ],
    loaders: [mswLoader],
    parameters: {
        chromatic: {
            modes: {
                light: { theme: "light" },
                dark: { theme: "dark" }
            }
        }
    }
};

export default preview;
