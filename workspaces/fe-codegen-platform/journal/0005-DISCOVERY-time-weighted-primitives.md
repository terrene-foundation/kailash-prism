---
type: DISCOVERY
date: 2026-04-11
phase: analyze
---

# Reweight Primitives by Time Savings, Not Screen Coverage

The UX architecture proposed 46 primitives for 80% screen coverage. The red team revealed the right metric is TIME savings, not screen area.

8-12 high-complexity organisms/templates deliver 60% of time savings:
- DataTable (15% of total implementation effort)
- Form with validation (15%)
- AppHeader + Sidebar + navigation (10%)
- DashboardLayout, ListLayout, DetailLayout, FormLayout templates (20%)

The remaining 34 atoms/molecules serve a different purpose: consistency enforcement (no hardcoded colors, spacing adherence). Both are needed but for different reasons. Build time-saving primitives first (organisms, templates), then consistency-enforcing primitives (atoms, tokens) in parallel.

This changes the Phase 1 priority order: start with the 9 high-value deliverables, not a bottom-up atom-first approach.
