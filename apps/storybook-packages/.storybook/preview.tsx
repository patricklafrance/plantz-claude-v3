import "./storybook.css";
import { withThemeByClassName } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";

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
    parameters: {
        a11y: { test: "error" },
        chromatic: {
            modes: {
                light: { theme: "light" },
                dark: { theme: "dark" }
            }
        }
    }
};

export default preview;
