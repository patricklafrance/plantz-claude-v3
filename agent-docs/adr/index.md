# Architectural Decisions

> Quick-reference for agents. Each line is a deliberate decision — read the linked ADR only if you need the full rationale.

| Decision                                                                                                             | ADR                                               |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Modular monolith with Squide local modules; every feature area registers via `ModuleRegisterFunction`                | [ADR-0001](0001-squide-local-modules.md)          |
| Each module and shared packages layer has its own Storybook instance                                                 | [ADR-0002](0002-domain-scoped-storybooks.md)      |
| No backend server — MSW + TanStack Query with BFF-per-module ownership (handlers, URLs per module; hooks in modules) | [ADR-0003](0003-msw-tanstack-query-data-layer.md) |
| Layered package architecture: `core` (foundation) → `api` (backend) → `core-module` (session/shell) → modules (UI)   | [ADR-0004](0004-layered-package-architecture.md)  |
