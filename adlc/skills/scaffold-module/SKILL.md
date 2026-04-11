---
name: scaffold-module
description: Scaffold a new Squide local module or subfolder in the monorepo.
license: MIT
---

# Scaffold Module

Create a new Squide local module or add a subfolder to an existing module.

## Inputs

| Input       | Description                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------- |
| `module`    | Module name (e.g., `management`, `watering`)                                                       |
| `subfolder` | _(optional)_ Subfolder name within the module (e.g., `notifications`). Omit for a top-level module |

## Modes

1. **New subfolder in existing module** — when `subfolder` is provided and the module directory already exists. Creates a new subfolder under the existing module.
2. **New top-level module** — when `subfolder` is omitted. Creates a new module.

## Naming derivation

All names are mechanically derived from `module` (and `subfolder` when present). **PascalCase** means split on `-`, capitalize each segment's first letter, join (e.g., `landing-page` → `LandingPage`).

### Top-level module (no subfolder)

| Name              | Formula                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| Package name      | `@modules/{module}`                                                           |
| Directory         | `{modules-dir}/{module}/`                                                     |
| Register function | `register` + PascalCase(module)                                               |
| Page component    | PascalCase(module) + `Page` (skip `Page` if module already ends with `-page`) |
| Register file     | `src/{registerFunction}.tsx`                                                  |
| Page file         | `src/{PageComponent}.tsx`                                                     |
| `$id`             | `{module}`                                                                    |
| Registry key      | `{module}`                                                                    |
| Route path        | `/{module}`                                                                   |
| Nav label         | PascalCase(module) with spaces between words                                  |
| Dev script        | `dev-{module}`                                                                |

### Subfolder within existing module

| Name              | Formula                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| Directory         | `{modules-dir}/{module}/{subfolder}/`                                               |
| Register function | `register` + PascalCase(module) + PascalCase(subfolder)                             |
| Page component    | PascalCase(subfolder) + `Page` (skip `Page` if subfolder already ends with `-page`) |
| Register file     | `src/{registerFunction}.tsx`                                                        |
| Page file         | `src/{PageComponent}.tsx`                                                           |
| `$id`             | `{module}-{subfolder}`                                                              |
| Registry key      | `{module}/{subfolder}`                                                              |
| Route path        | `/{module}/{subfolder}`                                                             |
| Nav label         | PascalCase(subfolder) with spaces between words                                     |
| Dev script        | `dev-{module}-{subfolder}`                                                          |

Subfolder modules share the parent module's package name (`@modules/{module}`) — they do NOT get their own package.json.

Where `{modules-dir}` is the Modules directory from the Project context section above.

## Reference module

Discover the reference module automatically: scan the modules directory for existing modules and pick the first one alphabetically. If the `scaffolding.referenceModule` config override is set (visible in the Project context preamble), use that instead.

Before creating any file, read the reference module's files: `package.json`, `tsconfig.json`, `src/index.ts`, and a register/page file pair from an existing subfolder.

Reproduce the same file skeleton with substituted names. Copy dependency versions and scripts exactly — never hardcode versions from memory.

## Process

### 1. Validate

**Top-level module:**

- Confirm the module directory does NOT exist. If it does, stop.

**Subfolder:**

- Confirm the parent module directory exists. If not, ask the user whether to create a top-level module first.
- Confirm the subfolder directory does NOT exist. If it does, stop.

### 2. Create module files

**Top-level module** — create these files under the module directory:

| File                         | Substitutions                                                                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`               | Name, description. Use `license` and `author` from the Project context preamble's Structure section. Copy `workspace:*` deps only. |
| `tsconfig.json`              | Identical copy from reference.                                                                                                     |
| `src/index.ts`               | Barrel export of the register function.                                                                                            |
| `src/{registerFunction}.tsx` | Register function name, route path, `$id`, nav label, page component import.                                                       |
| `src/{PageComponent}.tsx`    | Component name.                                                                                                                    |

**Subfolder** — create only these files under the subfolder directory:

| File                         | Substitutions                                                                |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `src/{registerFunction}.tsx` | Register function name, route path, `$id`, nav label, page component import. |
| `src/{PageComponent}.tsx`    | Component name.                                                              |

Then update the parent module's `src/index.ts` to add a barrel export for the new subfolder's register function.

### 3. Register in host

Discover the host app path from the Project context preamble's Structure section. Find the host's module registration file by grepping for existing module imports from the reference module.

Add the import and registry entry for the new module following the same pattern as the reference module.

Also add the package dependency and CSS `@source` directive by finding where the reference module is declared and adding equivalent entries.

### 4. Update module storybook

Find the module's storybook by looking for storybook apps that reference the module. Add story globs and `@source` directives for the new subfolder/module.

If the module storybook doesn't exist yet, skip and warn.

### 5. Update unified storybook

Find the unified storybook by grepping for existing module story globs. Add equivalent entries for the new module.

### 6. Update affected map

Find the affected storybooks map by grepping for the reference module's package name in files that define storybook dependencies. Add equivalent entries for the new module.

### 7. Add dev script

In root `package.json`, add the dev script following the same pattern as existing dev scripts.

### 8. Install and verify

1. Run `pnpm install`.
2. Run the `lint` command from the Project context preamble — fix any issues.
3. Run `validate-modules` on the new module path. Fix any issues — the reviewer will run the same checks.
