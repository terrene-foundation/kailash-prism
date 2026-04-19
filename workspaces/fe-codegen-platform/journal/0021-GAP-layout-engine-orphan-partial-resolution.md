---
type: GAP
date: 2026-04-20
created_at: 2026-04-20T06:30:00+08:00
author: agent
session_id: redteam-convergence-2026-04-20
session_turn: post-round2
project: fe-codegen-platform
topic: New Layout engine has zero production consumers; sub-path gate only partially resolves the orphan pattern
phase: redteam
tags: [orphan-detection, layout-engine, migration, public-api]
---

# 0021 — GAP — Layout engine orphan: partial resolution via sub-path gate

**Status**: Partial-resolution; migration shard pending

## Context

The new Layout engine (S5) shipped six composable primitives (Stack/Row/Grid/Split/Layer/Scroll) via `web/src/engines/layout/`. The shard delivered clean code + 49 new tests + engine-level wiring test, but round-1 /redteam code review flagged it as HIGH-1: zero production consumers. All 10 existing templates (`dashboard-template.tsx` through `wizard-template.tsx`) still compose against the legacy `engines/layout.tsx`, which has a broader API (`LayoutProvider`, `useLayout`, `useResponsive`, `Zone`, `VStack`) that the new engine intentionally does NOT replicate.

## The gap

Per `rules/orphan-detection.md` MUST Rule 1, every facade-shaped surface must have ≥1 production call site within 5 commits of landing. The new engine is not facade-shaped (it's atoms, not managers), but the broader principle — "code with no production consumer is a lie" — still applies.

Round-1 fix narrowed the gap but didn't close it: removed the `Layout*`-prefixed top-level barrel aliases (HIGH-2 resolved) so the engine no longer drags its unused surface into the public API; sub-path consumers can opt in via `@kailash/prism-web/engines/layout`. But "zero production consumers" remains true until a template migrates.

## What needs to happen

A migration shard must either:
1. **Grow the new engine** to cover legacy's orchestration surface (`LayoutProvider`/`useLayout`/`useResponsive`/`Zone`), then migrate templates one-by-one, then delete the legacy file.
2. **Keep the legacy for orchestration** + have it delegate to new primitives internally, making the new engine the implementation and legacy the orchestration wrapper.

Option 2 is smaller surface; option 1 is architecturally cleaner.

## Cost if ignored

The new engine continues to accumulate tests and maintenance cost with zero production use — the exact pattern `orphan-detection.md` was written to prevent. Every future template change ratchets up the legacy engine's inertia, making eventual migration harder.

## Tracking

Added to `workspaces/fe-codegen-platform/01-analysis/prism-0.4.0-scoping.md` roadmap as a dedicated migration shard (est. 2-3 sessions) for 0.5.0 or later.

## For Discussion

1. **Counterfactual**: If we had deleted the new engine instead of gating it (per `rules/orphan-detection.md` Rule 3 "Removed = Deleted, Not Deprecated"), would we have lost ~1,500 LOC of test-validated code with no path to recover? Or would the pressure of "we want those primitives" force migration to happen sooner?
2. **Data**: All 10 templates (`rg 'from.*engines/layout' web/src/templates/ | wc -l`) depend on legacy `engines/layout.tsx` which exports orchestration symbols (`LayoutProvider`/`useLayout`/`useResponsive`/`Zone`) the new engine does not provide. Which symbols are load-bearing vs vestigial? A per-symbol grep would identify the minimum compatible surface the new engine must grow.
3. **Incentive**: Does leaving the engine at the sub-path with tests-only consumers create a maintenance tax that keeps pressure on the migration, or does it let the migration sit forever because "everything works"?
