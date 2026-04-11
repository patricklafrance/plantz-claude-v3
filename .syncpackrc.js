// @ts-check

/** @type {import("syncpack").RcFile} */
export default {
    semverGroups: [
        {
            packages: ["@modules/*", "@packages/*"],
            dependencyTypes: ["prod", "peer"],
            range: "^",
            label: "Modules and Packages should use ^ for dependencies and peerDependencies."
        },
        {
            packages: ["@modules/*", "@packages/*"],
            dependencyTypes: ["dev"],
            range: "",
            label: "Modules and Packages should pin devDependencies."
        },
        {
            packages: ["@apps/*"],
            dependencyTypes: ["prod", "dev"],
            range: "",
            label: "Apps should pin dependencies and devDependencies."
        },
        {
            packages: ["workspace-root"],
            dependencyTypes: ["dev"],
            range: "",
            label: "Workspace root should pin devDependencies."
        }
    ],
    versionGroups: [
        {
            packages: ["**"],
            dependencyTypes: ["prod", "dev", "peer"],
            preferVersion: "highestSemver",
            label: "Apps and Packages should have a single version across the repository."
        }
    ]
};
