# Explorations

Investigations into tools, patterns, or approaches that were evaluated but **not adopted**. Kept here so future sessions don't re-investigate the same ground.

---

## RTK (Rust Token Killer)

**Date:** 2026-03-28
**Repo:** https://github.com/rtk-ai/rtk
**Verdict:** Not adopted — low ROI for this repo

### What it is

RTK is a Rust CLI proxy (~14.7K stars, v0.34.0) that sits between AI coding agents and shell commands, compressing Bash output before feeding it back to the LLM context window. It hooks into Claude Code via `PreToolUse`, rewriting Bash commands (e.g., `git status` -> `rtk git status`). Claims 60-90% token reduction through smart filtering, grouping, truncation, and deduplication.

### Why it was evaluated

We investigated whether RTK could meaningfully reduce token consumption in the ADLC pipeline.

### Why it was rejected

1. **Wrong bottleneck.** Read/Write/Edit tools account for ~70-80% of token growth. RTK only intercepts Bash command output.
2. **agent-browser dominance.** ~65% of Bash calls are `agent-browser` commands (our custom browser automation binary). RTK has no filter for it.
3. **Already self-truncated.** Build output is piped through `tail -N` patterns in agent code, pre-truncating before RTK could act.
4. **Tiny target.** Git-heavy agents (planner, architect) are the only RTK-compressible category and represent ~3% of total tokens.
5. **Windows issues.** Known stack overflow on startup (issue #855), no automated hook setup (`rtk init -g` falls back to degraded CLAUDE.md injection mode).
6. **Security concerns.** Shell injection via `sh -c` in `rtk err/test/summary` (issue #640), opt-out telemetry, full command strings stored in SQLite for 90 days.
7. **Estimated savings: ~4%** of total tokens (4-6M out of 128M) — doesn't justify setup and maintenance burden.

### Supporting data (from 30-step ADLC run)

| Agent type               | Steps | Tokens | % of total | Bash profile                                                          |
| ------------------------ | ----- | ------ | ---------- | --------------------------------------------------------------------- |
| Coders (Sonnet)          | 8     | ~96.5M | 75%        | 103 Bash calls in heaviest run; mostly agent-browser + pnpm with tail |
| Reviewers (Opus)         | 8     | ~24.5M | 19%        | Dominated by agent-browser                                            |
| Explorers (Sonnet)       | 5     | ~3.3M  | 3%         | 2 Bash calls each (generate-package-map + rm)                         |
| Planner/Architect/Others | mixed | ~7.1M  | 6%         | git/gh commands — the only RTK-compressible category                  |

---

## Parallel Slice Execution via Git Worktrees

**Date:** 2026-03-28
**Verdict:** Not adopted — nesting restriction blocks clean architecture; marginal gains don't justify complexity

### What it is

Run multiple slices simultaneously by giving each slice its own git worktree. Each worktree gets the full explorer → coder → reviewer trio. The planner would identify which slices can be developed in parallel based on its existing `Depends on` declarations, producing "waves" of parallelizable work.

### Why it was evaluated

The ADLC pipeline processes slices strictly sequentially. For features with parallelizable dependency graphs (e.g., the household feature has 3 slices that only depend on the foundation), wall-clock time could be reduced by running independent slices concurrently.

### Dependency graph example (household feature)

```
Wave 1: Slice 1 (Foundation)         ← sequential, must complete first
Wave 2: Slices 2, 3, 5              ← parallel (all depend only on Slice 1)
Wave 3: Slice 4                      ← depends on 1, 3
Wave 4: Slice 6                      ← depends on 3, 4, 5
```

6 sequential slices → 4 waves, with wave 2 running 3 slices simultaneously.

### What makes it technically plausible

1. **Claude Code supports `isolation: "worktree"` on agents** — each subagent gets its own git worktree and branch.
2. **Turborepo 2.8+ (this repo uses 2.8.12) shares cache across worktrees** — no redundant rebuilds.
3. **pnpm's content-addressable store** — `pnpm install` in each worktree is fast (symlinks to global store).
4. **Squide module isolation (ADR-0001)** — modules never import each other, so parallel slices touching different modules produce no file conflicts.
5. **Slices already declare `Depends on`** — the planner already has the dependency information needed to compute waves.

### The fundamental blocker: no nested subagent spawning

**Subagents cannot spawn other subagents.** This is a hard restriction in Claude Code ([#4182](https://github.com/anthropics/claude-code/issues/4182), [#19077](https://github.com/anthropics/claude-code/issues/19077), [#32731](https://github.com/anthropics/claude-code/issues/32731)).

The natural architecture is a 3-level hierarchy:

```
Orchestrator → Slice Runner (per worktree) → Explorer / Coder / Reviewer
```

This is impossible because the slice runner (a subagent) cannot spawn explorer/coder/reviewer (sub-subagents). Agent team teammates also cannot spawn anything.

### Evaluated workarounds

#### Option 1: Flatten to 2 levels (orchestrator spawns everything)

The orchestrator creates worktrees via Bash, then directly spawns all agents across all parallel slices. Each agent's prompt specifies the worktree's absolute path.

**Problems:**

- **SubagentStop hooks fire with wrong `cwd`** — hooks run build/lint/test against the orchestrator's directory, not the worktree. Every hook would need worktree-awareness.
- **Agents have no `cwd` parameter** — must use absolute paths for every tool call (Read, Write, Edit, Glob, Grep). One relative path and the agent writes to the wrong repo.
- **Reviewers are hard to parallelize** — each starts Storybook + host app dev server. 3 simultaneous instances means 3× memory, port management, and `agent-browser` routing.
- **Revision loops break clean fan-out** — orchestrator juggles N independent state machines (each slice's revision loop) simultaneously.
- **Context accumulation** — orchestrator holds results from N explorers + N coders + N reviewers, pushing context significantly higher than sequential flow.

#### Option 2: External Node.js orchestrator

A script outside Claude Code spawns N `claude` CLI processes (one per worktree). Each is a top-level instance that can spawn its own subagents. Bypasses the nesting restriction entirely but **leaves the ADLC framework** — loses hooks, supervision, structured agent definitions.

#### Option 3: Bash `claude --agent` workaround

A subagent invokes `claude --agent` via Bash to spawn nested agents. No structured error propagation, no progress tracking, no SubagentStop hooks, poor debuggability. Too fragile for production.

### Estimated gains

For the household feature (3 parallel slices in wave 2):

- **Coder parallelism saves ~40 min** (3 × ~20 min → ~20 min)
- **Explorer overhead: ~6 min** (2 min × 3, even if parallel)
- **Reviewer overhead: ~24 min** (8 min × 3, likely sequential)
- **Merge overhead: ~5-10 min**
- **Net savings: ~20-30 min** on a 3-4.5 hour run (~10-15% wall clock reduction)

Savings scale with more parallelizable slices, but many features have linear dependency chains where parallelism doesn't help.

### Decision

Deferred as a Claude Code–native solution. The nesting restriction blocks the clean 3-level architecture, and the flatten-to-2-levels workaround has too many rough edges (wrong `cwd` in hooks, fragile absolute paths, revision loop state management). See the Agent SDK exploration below for the viable path forward.

---

## Parallel Slices via Claude Agent SDK

**Date:** 2026-03-28
**Verdict:** Viable path forward — the only clean way to parallelize slices. Not yet adopted (requires engineering investment).

### What it is

Replace the `_adlc` SKILL.md orchestrator with an external Node.js script using `@anthropic-ai/claude-agent-sdk`. The SDK spawns N parallel Claude Code instances (one per slice, each in its own git worktree), and each instance can spawn its own subagents (explorer, coder, reviewer) — bypassing the nested subagent restriction entirely.

### Why it was evaluated

The git worktree exploration (above) identified that Claude Code's hard restriction on nested subagent spawning ([#4182](https://github.com/anthropics/claude-code/issues/4182), [#19077](https://github.com/anthropics/claude-code/issues/19077), [#32731](https://github.com/anthropics/claude-code/issues/32731)) blocks the natural 3-level hierarchy. Agent teams were also evaluated but teammates cannot spawn subagents ([#32731](https://github.com/anthropics/claude-code/issues/32731)) or use custom agent definitions ([#24316](https://github.com/anthropics/claude-code/issues/24316)). Skills cannot bypass the nesting restriction either — they inherit the parent's tool access. The SDK is the only mechanism that gives each instance full subagent capability.

### Architecture

```
External Node.js Orchestrator (parallel-slices.mjs)
  │
  ├── Phase 1-4: serial planning (domain-mapper → planner → architect → branch)
  │
  ├── Phase 5: parallel slice execution
  │   ├── query({ cwd: worktree-1, agents: {explorer, coder, reviewer} })
  │   ├── query({ cwd: worktree-2, agents: {explorer, coder, reviewer} })
  │   └── query({ cwd: worktree-3, agents: {explorer, coder, reviewer} })
  │
  ├── Merge worktree branches back to feature branch
  │
  └── Phase 6-9: serial post-processing (simplify → document → PR → monitor)
```

Each `query()` call is a top-level Claude Code instance with:

- `cwd` pointing to a git worktree
- `agents` with programmatic subagent definitions (explorer on Sonnet, coder/reviewer on Opus)
- `hooks` as in-process JavaScript callbacks (not stdin/stdout processes)
- `settingSources: ["project"]` to load CLAUDE.md, skills, agent-docs
- `permissionMode: "bypassPermissions"` for headless execution
- `maxBudgetUsd` for per-slice cost caps

### What the harness keeps vs. sheds

The move to the SDK replaces the **plumbing** (process-boundary wiring) while preserving the **logic** (policies, verification, agent prompts).

**Stays as-is (unchanged logic):**

- All 10 agent definitions (`.claude/agents/_adlc-*.md`) — read by a ~30-line loader, passed as `prompt` strings
- 15 of 17 skills (all except `_adlc` and `_safe-compact`) — loaded via `settingSources: ["project"]`
- Supervisor policies (`browser-thrash.mjs`, `wall-clock.mjs`, `install-gate.mjs`) — pure functions `(event, state) → decision`
- Verification handlers (`coder/handler.mjs`, `simplify/handler.mjs`, etc.) — pure functions `(cwd) → problems[]`
- Preflight guards (package-manager, no-cmd, bare-typecheck) — same checks
- `generate-package-map.mjs` — runs inside each worktree's explorer
- `agent-docs/` — present in every worktree
- Intra-worktree file handoffs (explorer-summary, verification-results, implementation-notes)
- ~70% of the test suite (unit tests of pure policy/handler functions)

**Rewired (same logic, different transport):**

- Hook entry points become SDK `hooks:` callbacks instead of stdin/stdout processes
- State management moves from disk (`supervisor-state.json`) to closure variables
- SubagentStop verification becomes a direct function call to the same handlers
- PreToolUse/PostToolUse supervision becomes in-process callbacks calling the same policies

**Fully replaced:**

- `_adlc` SKILL.md → SDK orchestrator script (~500-800 lines TypeScript)
- `_safe-compact` skill + hooks → SDK manages state in-process
- Hook entry-point wrappers (`subagent-stop.mjs`, `pre-tool-use.mjs`, `post-tool-use.mjs`) — ~200 lines of stdin/stdout glue
- State serialization layer (`state.mjs`, `context.mjs`, `events.mjs`) — ~200 lines of disk I/O
- `settings.json` hook registrations → SDK `hooks:` configuration
- `markers.json` → each worktree starts fresh
- ~20% of tests (integration tests of the stdin/stdout protocol)

**Consequence: Claude Code interactive sessions are no longer supported.** The supervisor, verification, and preflight hooks would only fire for SDK-spawned agents. A developer running `claude` in the terminal would not get wall-clock circuit breakers, browser-thrash detection, or verification gates. This is acceptable if the harness is only used for automated ADLC runs.

### Phantom dependency elimination (planner optimization)

Research revealed that most inter-slice dependencies are **phantom** — caused by conflating "the schema/data exists" with "the UI that creates it exists." In a mock-data architecture (MSW + TanStack DB), seed data makes every entity available from the start.

If the planner hoists all schemas, DB singletons, and seed data into a thin foundation slice, nearly all downstream dependencies vanish:

```
Current:  [1] → [2, 3, 5] → [4] → [6]     (4 waves)
Optimized: [Foundation] → [1-6 all parallel]  (2 waves)
```

The foundation slice is purely mechanical (types, DBs, factories, seed data, module skeletons). The planner would emit explicit wave declarations:

```markdown
## Execution Waves

### Wave 0 — Foundation

| Slice               | Touches                                      |
| ------------------- | -------------------------------------------- |
| `00-infrastructure` | Schemas, DBs, seed data, module registration |

### Wave 1 — Feature Slices (parallel)

| Slice               | Parallel Group       |
| ------------------- | -------------------- |
| `01-household-crud` | management-household |
| `02-invitations`    | management-household |
| `03-plant-sharing`  | management-plants    |
| ...                 | ...                  |
```

Slices in the same `parallel-group` (same module) serialize within the wave; slices in different groups run in parallel.

### New infrastructure required

| Component                  | Complexity | Description                                                                                                   |
| -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| SDK orchestrator script    | High       | ~500-800 lines. Full pipeline: plan → worktree fan-out → parallel slices → merge → post-processing.           |
| Agent definition loader    | Low        | ~30 lines. Reads `.claude/agents/*.md`, parses YAML frontmatter, returns SDK-compatible objects.              |
| Dependency DAG scheduler   | Medium     | Parses `Depends on:` from slices, groups into waves, schedules parallel `query()` calls per wave.             |
| Worktree lifecycle manager | Medium     | `git worktree add` from feature branch, seed `.adlc/`, `pnpm install`, merge back, clean up.                  |
| Port allocator             | Medium     | Each worktree's reviewer needs unique Storybook + host app ports. Passed via env vars.                        |
| Result collector           | Low        | After each worktree merge: copy `implementation-notes/` and `verification-results/` to main `.adlc/`.         |
| Metrics aggregator         | Low        | Merge per-worktree `run-metrics.json` into central file. Parallel-friendly naming: `{slice-id}/{agent}.json`. |

### SDK key capabilities

| Feature                               | Value                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `cwd` per instance                    | Point each to a different worktree                                            |
| `agents` option                       | Programmatic subagent definitions (model, prompt, tools per agent)            |
| `hooks` option                        | In-process JavaScript callbacks — no serialization, shared state via closures |
| `settingSources: ["project"]`         | Loads CLAUDE.md, skills from the repo                                         |
| `permissionMode: "bypassPermissions"` | Headless execution                                                            |
| `maxBudgetUsd`                        | Per-slice cost caps                                                           |
| `maxTurns`                            | Per-slice turn limits                                                         |
| ~12s cold start per instance          | Paid once per slice, parallel                                                 |

### Benefits beyond parallelism

1. **No process-spawn overhead.** Supervisor hooks fire as function calls instead of spawning a Node.js process + JSON serialization on every tool call.
2. **Deterministic orchestration.** `while` loops and `if` statements replace natural-language step counting. More predictable, more debuggable.
3. **Programmatic error recovery.** Real retry policies, partial failure modes (one slice failing doesn't kill others), budget caps, timeouts.
4. **Unified observability.** The orchestrator can log every agent spawn, verification result, and merge in a structured format.

### Costs and risks

1. **~500-800 lines of TypeScript** replaces ~80 lines of Markdown. More powerful but more to maintain.
2. **Loss of Claude's adaptive judgment** for orchestration edge cases. The SDK script must pre-code every error path.
3. **New dependency** (`@anthropic-ai/claude-agent-sdk`) in the project.
4. **`effort` frontmatter has no SDK equivalent.** Must approximate via prompt hints or wait for API support.
5. **12s cold start per `query()` call** (parallel, so paid once per wave, not per slice).

### Decision

Not yet adopted. This is the most promising path to parallel slice execution and offers significant benefits beyond parallelism (deterministic orchestration, in-process hooks, structured observability). The engineering investment is real (~500-800 lines orchestrator + infrastructure) but the harness logic (policies, verification, agent prompts) carries over with minimal changes. Revisit when:

- A feature warrants the parallelism investment (5+ independent slices)
- The harness is mature enough that the orchestration layer is the bottleneck, not the verification/policy layer
- The team is ready to drop Claude Code interactive session support for the harness
