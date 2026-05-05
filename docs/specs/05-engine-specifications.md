# 05 Engine Specifications

Spec version: 0.1.0 | Status: DRAFT | Governs: DataTable, Form, Navigation, Layout, Theme, AI Chat engine contracts

This document was split into sub-domain files in 2026-05-06 per `specs-authority.md` MUST 8 (300-line cap). The original 2242-line monolith is now an index pointing at 13 self-contained sub-specs. External cross-references (e.g. from `00-prism-manifest.md`, `specs/_index.md`, audit reports) target this file as the canonical entry point; sub-files preserve the original `§5.X` numbering for grep-stability against historical citations.

---

## Sub-Specs

| File                                                                       | Section         | Domain                                                                                                                                                                                                |
| -------------------------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [05a-engine-contract-format.md](05a-engine-contract-format.md)             | Preamble        | Engine contract format — the 10-point template every engine spec follows                                                                                                                              |
| [05b-data-table-engine.md](05b-data-table-engine.md)                       | §5.1            | DataTable Engine — props, state, callbacks, composition, performance, a11y, responsive, web/Flutter notes                                                                                             |
| [05c-data-table-adapter.md](05c-data-table-adapter.md)                     | §5.1.1          | DataTableAdapter\<T\> interface (since 0.2.2) — overview, motivation, full TypeScript interface                                                                                                       |
| [05d-data-table-adapter-rationale.md](05d-data-table-adapter-rationale.md) | §5.1.1 cont.    | DataTableAdapter rationale — method justifications, comparison to ChatAdapter, design decisions, open questions, expected LOC savings                                                                 |
| [05e-form-engine.md](05e-form-engine.md)                                   | §5.2            | Form Engine — schema-driven forms with validation, conditional fields, multi-step                                                                                                                     |
| [05f-form-adapter.md](05f-form-adapter.md)                                 | §5.2.2          | FormAdapter\<TValues, TResult\> interface (since 0.2.1) — lifecycle, design decisions, migration from `onSubmit`                                                                                      |
| [05g-navigation-engine.md](05g-navigation-engine.md)                       | §5.3            | Navigation Engine — sidebar, top-nav, bottom-nav, breadcrumb patterns                                                                                                                                 |
| [05h-layout-engine.md](05h-layout-engine.md)                               | §5.4            | Layout Engine — VStack, Row, Grid, Split, Layer, Scroll primitives + responsive composition                                                                                                           |
| [05i-theme-engine.md](05i-theme-engine.md)                                 | §5.5            | Theme Engine — token loading, CSS variable injection, ThemeData generation, dark/brand switching, per-page overrides                                                                                  |
| [05j-ai-chat-engine.md](05j-ai-chat-engine.md)                             | §5.6            | AI Chat Engine — core props, message types, composition, transport adapter                                                                                                                            |
| [05k-ai-chat-streaming-tools.md](05k-ai-chat-streaming-tools.md)           | §5.6 cont.      | AI Chat Engine — state management, ConversationTemplate wired mode, streaming, tool-call visualization, action plan, citations, conversation management, input config, perf/a11y/responsive contracts |
| [05l-engine-cross-cutting.md](05l-engine-cross-cutting.md)                 | §5.7-5.9        | Cross-cutting — error boundaries, Kailash SDK integration (Nexus/DataFlow/Kaizen), offline behavior                                                                                                   |
| [05m-0.6.0-additions.md](05m-0.6.0-additions.md)                           | 0.6.0 additions | Filter Engine (FilterBar molecule) + DataTable ColumnDef.field contract relaxation                                                                                                                    |

---

## Reading Order

For a fresh reader: `05a` (contract format) → `05b` (DataTable) → `05e` (Form) → `05g`/`05h`/`05i` (navigation/layout/theme) → `05j`/`05k` (AI Chat) → `05l` (cross-cutting). Adapters (`05c`/`05d`/`05f`) are referenced by their parent engine specs and read on demand. `05m` documents the 0.6.0 deltas layered onto the above.

For a writer extending an engine: read the relevant sub-file end-to-end, edit in place. When a sub-file approaches 300 lines (per `specs-authority.md` MUST 8), split it further before adding more.
