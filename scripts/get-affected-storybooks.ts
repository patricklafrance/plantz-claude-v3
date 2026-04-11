import { execSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const StorybookDependencies = {
    "@apps/storybook-packages": ["@packages/components", "@packages/api"],
    "@apps/storybook-management": ["@modules/management"],
    "@apps/storybook-watering": ["@modules/watering"]
} as const;

interface TurborepoAffectedItem {
    name: string;
    path: string;
}

let affectedPackages: string[];
let affectedStorybooks: Record<keyof typeof StorybookDependencies, boolean>;

function createAffectedStorybooksRecordFromBooleanValue(value: boolean) {
    return (Object.keys(StorybookDependencies) as (keyof typeof StorybookDependencies)[]).reduce(
        (acc, x) => {
            acc[x] = value;

            return acc;
        },
        {} as Record<keyof typeof StorybookDependencies, boolean>
    );
}

try {
    const baseSha = process.env.BASE_SHA;

    if (!baseSha) {
        throw new Error('[getAffectedStorybooks] The "BASE_SHA" environment variable is not set.');
    }

    // Find packages diverging from the main branch.
    const command = `pnpm turbo ls --filter=...[${baseSha}] --output=json`;

    const rawResult = execSync(command, {
        cwd: process.cwd(),
        encoding: "utf8",
        // Suppress stderr to avoid outputting Turborepo logs.
        stdio: ["ignore", "pipe", "ignore"]
    });

    const parsedResult = JSON.parse(rawResult);

    affectedPackages = parsedResult.packages?.items.map((x: TurborepoAffectedItem) => x.name) || [];

    if (affectedPackages.length > 0) {
        // oxlint-disable-next-line eslint/no-console -- CI script; console output is intentional
        console.info(`[getAffectedStorybooks] Found ${affectedPackages.length} affected packages:`, affectedPackages);

        // Find the affected Storybook applications based on the affected packages.
        affectedStorybooks = (Object.keys(StorybookDependencies) as (keyof typeof StorybookDependencies)[]).reduce(
            (acc, x) => {
                acc[x] =
                    // If the package is the actual Storybook application package, add the Storybook package name to the list.
                    affectedPackages.includes(x) ||
                    // If the package is a dependency of a Storybook application package, add the Storybook package name to the list.
                    StorybookDependencies[x].some((y: string) => affectedPackages.includes(y));

                return acc;
            },
            {} as Record<keyof typeof StorybookDependencies, boolean>
        );

        // Get the package name of only the affected Storybook applications.
        const packageNames = (Object.keys(affectedStorybooks) as (keyof typeof StorybookDependencies)[]).reduce(
            (acc, x) => {
                if (affectedStorybooks[x]) {
                    acc.push(x);
                }

                return acc;
            },
            [] as (keyof typeof StorybookDependencies)[]
        );

        if (packageNames.length > 0) {
            // oxlint-disable-next-line eslint/no-console -- CI script; console output is intentional
            console.info(`[getAffectedStorybooks] Found ${packageNames.length} affected Storybook applications:`, packageNames);
        } else {
            // oxlint-disable-next-line eslint/no-console -- CI script; console output is intentional
            console.info("[getAffectedStorybooks] Found no affected Storybook application.");
        }
    } else {
        // oxlint-disable-next-line eslint/no-console -- CI script; console output is intentional
        console.info("[getAffectedStorybooks] Found no affected package.");

        affectedStorybooks = createAffectedStorybooksRecordFromBooleanValue(false);
    }
} catch (error: unknown) {
    // oxlint-disable-next-line eslint/no-console -- CI script; console output is intentional
    console.error("[getAffectedStorybooks] An error occured while retrieving the affected packages from Turborepo:", error);
    // oxlint-disable-next-line eslint/no-console -- CI script; console output is intentional
    console.info("[getAffectedStorybooks] Returning all Storybook applications as affected.");

    affectedStorybooks = createAffectedStorybooksRecordFromBooleanValue(true);
}

const gitHubOutputPath = process.env.GITHUB_OUTPUT;

if (!gitHubOutputPath) {
    throw new Error('[getAffectedStorybooks] The "GITHUB_OUTPUT" environment variable is not set.');
}

// Values will be available in the GitHub action using syntax like: "steps.affected.outputs['@apps/storybook-packages']"".
for (const [key, value] of Object.entries(affectedStorybooks)) {
    appendFileSync(gitHubOutputPath, `${key}=${value}\n`);
}

process.exit(0);
