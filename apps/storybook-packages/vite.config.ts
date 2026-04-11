import tailwindcss from "@tailwindcss/postcss";
import { defineConfig } from "vite";

export default defineConfig({
    // Override Storybook's default chrome87 target to allow top-level await
    // in story files. Chromatic runs modern Chromium (130+).
    build: {
        target: "esnext"
    },
    css: {
        postcss: {
            plugins: [tailwindcss()]
        }
    }
});
