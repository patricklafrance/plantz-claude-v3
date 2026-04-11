import { defineConfig } from "./src/config.js";

export default defineConfig({
    ports: {
        storybook: 6006,
        hostApp: 8080,
    },
    agents: {
        coder: {
            skills: ["accessibility", "frontend-design", "workleap-react-best-practices"],
        },
    },
});
