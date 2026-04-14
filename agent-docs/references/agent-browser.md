# agent-browser

CLI tool for browser automation. Load the `agent-browser` skill to learn the commands.

## When to use

After implementing UI changes — verify that your changes render correctly in the browser.

You do NOT need agent-browser for:

- Pure backend/config/tooling changes
- Changes fully covered by lint, typecheck, or unit tests
- Story-only changes (Storybook a11y tests via `pnpm test` cover these)

## Dev servers

| Target            | Command              | Default port |
| ----------------- | -------------------- | ------------ |
| Unified storybook | `pnpm dev-storybook` | 6006         |
| Host app          | `pnpm dev-app`       | 8080         |

Use the **host app** for route-based verification. Use the **unified storybook** for story-based verification.

### Starting and detecting the port

Start dev servers in the background. The server picks an available port automatically and prints it in stdout. Parse the URL to get the actual port:

```bash
# Start in background — do NOT pipe through head (kills the server):
pnpm dev-storybook > /tmp/sb-output.log 2>&1 &

# Wait for the "ready" line and extract the port:
timeout 90 grep -m1 "localhost:" /tmp/sb-output.log
# Output: http://localhost:6006/  (or a different port if 6006 was taken)
```

The same pattern works for the host app (`pnpm dev-app`).

## Browser verification

Key commands (load the `agent-browser` skill for full docs):

| Command                             | Use for                               |
| ----------------------------------- | ------------------------------------- |
| `diff snapshot`                     | See what changed after an action      |
| `eval --stdin`                      | Batch multiple DOM checks in one call |
| `is visible <sel>`                  | Boolean element check                 |
| `find role button click --name "X"` | One-step locate + action              |
| `batch --json`                      | Combine open + wait + snapshot        |
| `snapshot -i -c`                    | Compact interactive snapshot          |
| `screenshot`                        | Visual layout verification only       |

## Host app

### Authentication

The host app requires login. Demo credentials: `alice@example.com` / `password`.

### Routes

| Route                | Module                              |
| -------------------- | ----------------------------------- |
| `/`                  | today/landing-page (index redirect) |
| `/today`             | today/landing-page                  |
| `/management/plants` | management/plants                   |
| `/profile`           | management/account                  |

## Storybook URL pattern

Stories are addressed by their kebab-cased title and story name:

```
http://localhost:<port>/?path=/story/{kebab-title}--{story-name}
```

Example: a story with title `Management/Plants/Pages/PlantsPage` and export `Default`:

```
http://localhost:6006/?path=/story/management-plants-pages-plantspage--default
```
