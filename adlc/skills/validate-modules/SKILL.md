---
name: validate-modules
description: Validate that Squide local modules conform to the expected structure and wiring.
license: MIT
---

# Validate Modules

Read-only validation. Verify that modules are correctly structured and wired into the host, storybooks, and CI.

## Inputs

| Input              | Description                                                            |
| ------------------ | ---------------------------------------------------------------------- |
| `affected-modules` | Module paths to validate (e.g., `{modules-dir}/{module}/{subfolder}/`) |

Where `{modules-dir}` is the Modules directory from the Project context section above.

## Naming derivation

Derived from the module path. **PascalCase** means split on `-`, capitalize each segment's first letter, join.

### Top-level module (`{modules-dir}/{module}/`)

| Name              | Formula                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| Package name      | `@modules/{module}`                                                           |
| Register function | `register` + PascalCase(module)                                               |
| Page component    | PascalCase(module) + `Page` (skip `Page` if module already ends with `-page`) |
| Registry key      | `{module}`                                                                    |
| `$id`             | `{module}`                                                                    |
| Dev script        | `dev-{module}`                                                                |

### Subfolder (`{modules-dir}/{module}/{subfolder}/`)

| Name              | Formula                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| Package name      | `@modules/{module}` (shared with parent)                                            |
| Register function | `register` + PascalCase(module) + PascalCase(subfolder)                             |
| Page component    | PascalCase(subfolder) + `Page` (skip `Page` if subfolder already ends with `-page`) |
| Registry key      | `{module}/{subfolder}`                                                              |
| `$id`             | `{module}-{subfolder}`                                                              |
| Dev script        | `dev-{module}-{subfolder}`                                                          |

## Process

### 1. Run all checks for each module

Use the Structure section from the Project context preamble to resolve host app path, apps directory, and modules directory.

- **File structure** — Top-level module: `package.json`, `tsconfig.json`, `src/index.ts`, `src/{registerFunction}.tsx`, `src/{PageComponent}.tsx` exist. Subfolder: `src/{registerFunction}.tsx`, `src/{PageComponent}.tsx` exist.
- **Package.json** (top-level only) — `name` matches derived name. `license` and `author` match the values from the Project context preamble. `exports` is `"./src/index.ts"`.
- **Barrel export** — module's `src/index.ts` exports the register function.
- **Register function $id** — If the register file calls `registerNavigationItem`, the `$id` value matches the derived `$id`. Skip if no nav item is registered.
- **Host registration** — The host app's module registration file imports the register function and has the registry key. The host app's `package.json` lists the package in dependencies.
- **Host CSS** — The host app's global CSS has a `@source` directive for the module.
- **Module storybook** — The module's storybook has a story glob and CSS `@source` directive. Skip if module storybook doesn't exist.
- **Unified storybook** — The unified storybook has a story glob and CSS `@source` directive.
- **Affected detection** — The affected storybooks map includes the package name in the module's storybook dependencies entry.
- **Dev script** — Root `package.json` has the derived dev script name.
- **Tsconfig** — Extends `"@workleap/typescript-configs/library.json"`.

### 2. Report

Output a checklist per module. `[x]` for passing, `[ ]` for failures with a one-line description of what's wrong.
