import path from "node:path";

import { defineBuildConfig } from "@workleap/rslib-configs";

export default defineBuildConfig({
    entry: {
        cli: "./src/cli.ts",
        index: "./src/index.ts"
    },
    tsconfigPath: path.resolve("./tsconfig.build.json")
});
