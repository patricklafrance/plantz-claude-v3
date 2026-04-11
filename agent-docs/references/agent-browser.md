# agent-browser

CLI tool for browser automation, installed as a workspace devDependency. Load the `agent-browser` skill to learn the commands.

## When to use

After implementing UI changes — before reporting a task complete, verify that your changes render correctly in the browser.

You do NOT need agent-browser for:

- Pure backend/config/tooling changes
- Changes fully covered by lint, typecheck, or unit tests
- Story-only changes (Storybook a11y tests via `pnpm test` cover these)

## Dev servers

| Target            | Command              | Port | URL                     |
| ----------------- | -------------------- | ---- | ----------------------- |
| Host app          | `pnpm dev-host`      | 8080 | `http://localhost:8080` |
| Unified storybook | `pnpm dev-storybook` | 6006 | `http://localhost:6006` |

Use the **host app** for route-based verification (page navigation, login flows, cross-module interactions). Use the **unified storybook** for story-based verification (component variants, visual states).

### Starting dev servers

Start servers in the background **without piping through `head`** — piped commands kill the server when the pipe closes:

```bash
# CORRECT — redirect output, run_in_background handles backgrounding:
pnpm dev-storybook > /dev/null 2>&1
pnpm dev-host > /dev/null 2>&1

# WRONG — head exits after N lines, breaking the pipe and killing the server:
pnpm dev-storybook 2>&1 | head -5    # ← server dies
```

### Waiting for dev servers

After starting a dev server, use the readiness check instead of manual `sleep && curl` polling:

```bash
node .claude/agents/scripts/wait-for-dev-server.mjs --port 6006 --name Storybook
node .claude/agents/scripts/wait-for-dev-server.mjs --port 8080 --name "Host app"
```

Options: `--port <port>` (required), `--timeout 90` (seconds, default), `--name <label>`. Exit codes: 0 = ready, 1 = timed out. On timeout, the script reports whether the port is listening (server stuck) or not (server not running). Do NOT use `sleep N && curl` loops — they waste tool calls and wall-clock time.

### Stopping dev servers

Always stop the dev server when done:

```bash
# Linux:
kill -9 $(lsof -ti :8080) 2>/dev/null   # host
kill -9 $(lsof -ti :6006) 2>/dev/null   # storybook
# Windows:
netstat -ano | grep :<PORT> | grep LISTENING
taskkill //PID <PID> //T //F
```

## Browser verification

Key commands:

| Command                             | Use for                               |
| ----------------------------------- | ------------------------------------- |
| `diff snapshot`                     | See what changed after an action      |
| `eval --stdin`                      | Batch multiple DOM checks in one call |
| `is visible <sel>`                  | Boolean element check                 |
| `is enabled <sel>`                  | Boolean element check                 |
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
| `/management/user`   | management/user                     |

## Storybook URL pattern

Stories are addressed by their kebab-cased title and story name:

```
http://localhost:6006/?path=/story/{kebab-title}--{story-name}
```

Example: a story with title `Management/Plants/Pages/PlantsPage` and export `Default` maps to:

```
http://localhost:6006/?path=/story/management-plants-pages-plantspage--default
```
