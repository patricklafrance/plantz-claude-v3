---
name: browser-recovery
description: Recovery process for agents stuck in browser interaction loops. Load when the runtime supervisor detects browser thrashing and suggests this skill.
license: MIT
---

# Browser Recovery

Recover from a browser interaction loop. Do not skip steps — each one builds on the previous.

## Process

### 1. Stop and reframe

State your actual verification goal in plain language — not the browser interaction you were attempting, but what you are trying to prove about the code.

Ask yourself: _"If I had no browser at all, how would I know this works?"_

### 2. Investigate the source code

Read the source code of the component you are interacting with. Understand:

- What it renders and under what conditions
- How it manages state (props, hooks, context, stores)
- What events it listens to and what handlers do
- Whether it uses portals, iframes, lazy loading, or other indirection

The answer to "why isn't this working in the browser" is almost always in the source code.

### 3. Generate alternatives

Given what you now understand, brainstorm alternative ways to verify your goal.

**If your primary task is verification** (proving acceptance criteria pass):

- DOM queries (`agent-browser eval`) targeting the actual rendered structure
- Storybook play functions that exercise the interaction programmatically
- Simplifying the interaction (e.g., verifying a sub-step instead of the full flow)

**If your primary task is implementation** (building and validating as you go):

- Direct code inspection — reading the logic to confirm correctness
- Unit or integration tests that assert the behavior
- Build output or type-checking to verify structural correctness

Generate as many alternatives as the situation warrants.

**Example:** Instead of repeatedly screenshotting to check if a dialog appeared after a click:

```bash
pnpm exec agent-browser eval --stdin <<'EOF'
JSON.stringify({
    hasDialog: !!document.querySelector('[role=dialog]'),
    dialogTitle: document.querySelector('[role=dialog] h2')?.textContent ?? null
})
EOF
```

One DOM query replaces a screenshot loop — and gives you structured data to assert against.

### 4. Execute

Try your alternatives. If one does not work, try another. Use the browser again only after you have done substantive non-browser work (reading source, writing code, running tests).

### 5. Accept or move on

If no alternative succeeds, document the limitation in the output file your process defines (e.g., the results or notes file for this slice) and continue with the next task.
