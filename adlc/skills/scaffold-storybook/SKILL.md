---
name: scaffold-storybook
description: Scaffold a module-scoped Storybook.
license: MIT
---

# Scaffold Storybook

Create a module-scoped Storybook application.

## Inputs

| Input    | Description                                  |
| -------- | -------------------------------------------- |
| `module` | Module name (e.g., `management`, `watering`) |

## Naming derivation

| Name              | Formula                                  |
| ----------------- | ---------------------------------------- |
| Storybook path    | `{apps-dir}/{module}-storybook/`         |
| Package name      | `@apps/{module}-storybook`               |
| Dev script        | `dev-{module}-storybook`                 |
| Chromatic token   | `{MODULE_UPPER}_CHROMATIC_PROJECT_TOKEN` |
| Chromatic step id | `chromatic-{module}`                     |
| Module title      | Capitalize first letter of `{module}`    |

Where `{apps-dir}` is the Apps directory from the Project context section above.

Module-level values are discovered at runtime:

| Value                 | How                                                       |
| --------------------- | --------------------------------------------------------- |
| Module subfolders     | `ls {modules-dir}/{module}/` (directories only)           |
| Module package name   | Read `{modules-dir}/{module}/package.json` → `name` field |
| Story globs (module)  | `../../{modules-dir}/{module}/**/src/**/*.stories.tsx`    |
| Story globs (unified) | `../../{modules-dir}/{module}/**/src/**/*.stories.tsx`    |

## Reference storybook

Discover the reference storybook automatically: scan the apps directory for existing module storybooks and pick the first one. If the `scaffolding.referenceStorybook` config override is set (visible in the Project context preamble), use that instead.

Before creating any file, read all files in the reference storybook:

1. `package.json`
2. `.storybook/main.ts`
3. `.storybook/preview.tsx`
4. `.storybook/storybook.css`
5. `.storybook/vitest.setup.ts`
6. `chromatic.config.json`
7. `tsconfig.json`
8. `vite.config.ts`
9. `vitest.config.ts`

Copy dependency versions and config values exactly — never hardcode from memory.

## Process

### 1. Validate

- Confirm the module directory exists. If not, ask the user.
- Confirm the storybook directory does NOT exist. If it does, stop.
- Scan the module directory for subfolders.
- Read the module's `package.json` to get its package name.

### 2. Create storybook files

Create 9 files under the storybook directory. Clone each from the reference.

**Files with substitutions:**

| File                       | Changes                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`             | `name` and `description` only. Copy everything else verbatim.                                                                        |
| `.storybook/main.ts`       | Replace `stories` array with globs covering the module's subfolders.                                                                 |
| `.storybook/storybook.css` | Replace module-specific `@source` lines with ones covering the module's source. Keep the `@import` and shared package sources as-is. |
| `chromatic.config.json`    | `storybookBaseDir` → storybook path. Remove `projectId` — the user sets it after creating the Chromatic project.                     |
| `vitest.config.ts`         | `test.name` → `{module}-storybook`.                                                                                                  |

**Files cloned without changes:** `preview.tsx`, `vitest.setup.ts`, `tsconfig.json`, `vite.config.ts`.

### 3. Add dev script

In root `package.json`, add:

```
"dev-storybook-{module}": "turbo run dev --filter=@apps/{module}-storybook"
```

### 4. Update unified storybook

In the unified storybook's `.storybook/` directory:

1. `main.ts` — add story globs under a `// {ModuleTitle}` comment section.
2. `storybook.css` — add `@source` directives for the module's source files.

### 5. Update affected map

Find the affected storybooks map (grep for existing storybook dependency entries). Add a new entry:

```ts
"@apps/{module}-storybook": [
    "@modules/{module}"
]
```

Only list module package names (`@modules/*`) — never shared packages.

### 6. Add Chromatic CI step

Find the Chromatic CI workflow file (grep for existing Chromatic steps). Add a step after the last module step but before "Chromatic - Packages":

```yaml
- name: Chromatic - {ModuleTitle}
  id: chromatic-{module}
  uses: chromaui/action@latest
  with:
      projectToken: ${{ secrets.{MODULE_UPPER}_CHROMATIC_PROJECT_TOKEN }}
      workingDir: {apps-dir}/{module}-storybook
      onlyChanged: true
      exitOnceUploaded: true
      autoAcceptChanges: main
      skip: ${{ steps.affected-storybooks.outputs['@apps/{module}-storybook'] == 'false' }}
      debug: true
```

### 7. Update knip config

In root `knip.json`, add a workspace entry for the new storybook. Copy the `ignoreDependencies` list from an existing module storybook — it changes when shared packages are added.

### 8. Install and verify

1. Run `pnpm install`.
2. Run the `lint` command from the Project context preamble — fix any issues.
