---
type: RISK
date: 2026-04-12
created_at: 2026-04-12T16:35:00+08:00
author: agent
session_id: analyze-v2
session_turn: 1
project: fe-codegen-platform
topic: Engine build scope likely underestimated — 5 engines in 1-2 sessions is aggressive
phase: analyze
tags: [feasibility, engines, session-scope, risk]
---

# Engine Build Scope Likely Underestimated

Red team feasibility analysis reveals Sprint B1 (5 engines: DataTable, Form, Navigation, Layout, Theme) is likely 2-3 sessions, not the planned 1-2. Each engine includes complex behaviors:

- DataTable: virtual scroll (@tanstack/virtual), sorting, filtering, pagination, bulk actions, responsive card-grid fallback, column configuration
- Form: zod/yup validation, multi-section, conditional fields, file upload, submission handling
- Navigation: collapsible sidebar, responsive rail/drawer/full modes, breadcrumbs, routing integration

DataTable alone is a full-session effort when including tests, accessibility, and token integration.

Similarly, Sprint B2 (58 atoms+molecules+organisms) requires 4-5 parallel agents with strict file ownership to complete in 2 sessions.

**Impact**: Total Phase 1 timeline shifts from 5 sessions to 6-7 sessions. This doesn't change the fundamental value proposition (still faster than 50-100 sessions without Prism) but sets more realistic expectations.

**Mitigation**: Define a "compiler MVP" (Tailwind + ThemeData output for 1 theme) as the Sprint 1 unblocking deliverable, separate from the full compiler scope. Budget Sprint B1/C1 at 2 sessions.

## For Discussion

- Should Sprint B1 be split into B1a (DataTable + Form — highest time-savings) and B1b (Navigation + Layout + Theme — consistency infrastructure)?
- Is a 7-session Phase 1 still acceptable ROI given the 2-4 session savings per project?
- The decision gates (Mid-Phase 1, Flutter Go/No-Go) need maximum latency specs (e.g., 4-hour human response) or auto-proceed criteria — otherwise gates block the parallel model. How fast can the human commit to reviewing gates?
