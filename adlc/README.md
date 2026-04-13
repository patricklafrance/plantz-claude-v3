# @patlaf/adlc

Agent-Driven Lifecycle CLI — a multi-agent pipeline that plans, implements, and ships features.

See the [root README](../README.md) for full documentation.

## Quick start

```bash
pnpm add @patlaf/adlc

# Implement a new feature (text mode)
pnpm adlc feat "Add a household feature"

# Implement a new feature (GitHub issue mode)
pnpm adlc feat --issue 52

# Fix issues flagged on a PR (text mode)
pnpm adlc fix 42 "Issue #51: Fix color..."

# Fix issues flagged on a PR (GitHub mode)
pnpm adlc fix --pr 42
```
