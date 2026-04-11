# Color Mode

Every user-facing feature must support light, dark, and system (OS-preference) modes.

## How it works

Dark mode is **class-based** (`.dark` class on an ancestor), not media-query-based.
Theme tokens (CSS custom properties) swap automatically between `:root` and `.dark`
blocks in `packages/components/src/styles/globals.css`.

## Rules

Never use hardcoded color values in component classes — use the theme tokens from
`globals.css`. Hardcoded colors bypass the theme swap and break in dark mode.

- **Bad:** `className="bg-white text-gray-900 border-gray-200"`
- **Good:** `className="bg-background text-foreground border-border"`

When a component needs different values in dark mode beyond what the token swap
provides, use the `dark:` variant prefix. Never use raw
`@media (prefers-color-scheme: dark)` in component CSS — the `dark:` variant is
class-based in this repo, so a raw media query will desynchronize from the app's
color mode switcher.

- **Bad:** `@media (prefers-color-scheme: dark) { .card { background: #1a1a1a; } }`
- **Good:** `className="bg-muted dark:bg-input/30"`

## Token reference

The canonical list of theme tokens and custom breakpoints lives in
`packages/components/src/styles/globals.css` under the `@theme inline` block.
Do not duplicate the list elsewhere — open that file to see what is available.

## Dark mode pitfalls

Beyond the token and `dark:` variant rules above, avoid these common mistakes that
`typecheck` cannot catch:

- Text contrast — never invisible or near-invisible text against its background.
- Logo visibility — never a logo that vanishes or becomes unreadable.
- Border visibility — never borders that disappear into the background.
- Input fields — never input text or placeholders that blend into the field background.
- Dialog/sheet backdrops — never a raw white or raw black backdrop.
- No hardcoded `white`, `black`, `gray-*` classes leaking through.
