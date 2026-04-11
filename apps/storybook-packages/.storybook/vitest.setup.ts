import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview";
import { setProjectAnnotations } from "@storybook/react-vite";
import { beforeAll } from "vitest";

import * as previewAnnotations from "./preview.tsx";

const annotations = setProjectAnnotations([a11yAddonAnnotations, previewAnnotations]);

// Run Storybook's beforeAll hook (for addons that need initialization)
beforeAll(annotations.beforeAll);
