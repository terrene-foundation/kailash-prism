# Red Team Round 2: Post-Architecture Validation

**Date**: 2026-04-12
**Scope**: Adversarial review of final architecture decision, updated implementation plan, and validated specs
**Method**: Three parallel red team passes — consistency, feasibility, failure modes

---

## 1. Plan-Spec Consistency

Three agents cross-checked the implementation plan against 11 specification documents.

| Check | Verdict |
|-------|---------|
| Component counts (plan vs spec 03) | CONSISTENT — 25 atoms, 22 molecules, 15+7 organisms match |
| Engine list (plan vs spec 05) | CONSISTENT — 6 engines match exactly |
| Repo structure (plan vs spec 08) | MINOR — "Stack" in plan vs "VStack" in spec 08; resolve before implementation |
| Specs without plan items | MINOR — DESIGN.md parser/validator assumed under compiler; should be explicit |
| Plan items without specs | MINOR — Phase 3 integrations (Stitch, Marionette) lack spec documents |

**Resolution required**: Standardize layout primitive naming to "Stack" (matching plan, grammar.yaml, and docs/specs/04) and update spec 08 if it uses "VStack".

---

## 2. Feasibility Assessment

| Dimension | Verdict | Key Finding |
|-----------|---------|-------------|
| Dependency chains (A→B/C) | RISKY | Compiler MVP (1 theme, Tailwind + ThemeData) must be defined as the unblocking deliverable separate from full compiler scope |
| Sprint B1: 5 engines in 1-2 sessions | RISKY | Realistically 2-3 sessions. DataTable alone is a full-session effort. Budget 2 sessions. |
| Sprint B2: 58 components in 1-2 sessions | FEASIBLE | Requires 4-5 parallel agents with strict file ownership. Budget 2 sessions. |
| Flutter parallel execution | FEASIBLE | Zero file contention between web/ and flutter/. True parallel works. |
| Decision gates as bottlenecks | RISKY | Gates require human within 4 hours. Define auto-proceed criteria: "if no human response in 4 hours and no HALT signal, proceed." |

**Revised Phase 1 estimate**: 6-7 sessions (up from 5). Still strongly positive ROI (saves 30-80 sessions/year at 10 projects).

---

## 3. Failure Mode Status

### Original FAIL Modes (from Round 1)

| ID | Description | Status |
|---|---|---|
| FAIL-01 | Dual maintenance (primitives + guidance) | PARTIALLY MITIGATED — 300-line compression target exists but no enforcement gate |
| FAIL-02 | DESIGN.md bottleneck for non-designers | RESOLVED — /scaffold --theme flag + brief-to-spec template added |
| FAIL-03 | Dual-framework splits focus | RESOLVED — Flutter Go/No-Go gate at Session 3 |
| FAIL-04 | Initiative stalls with inconclusive results | RESOLVED — Numeric success metrics at Phase 1 and Phase 2 gates |
| FAIL-05 | Composition layer never materializes | PARTIALLY MITIGATED — In Workstream D but ships Session 4, after engines in Sessions 2-3 |

### New FAIL Modes (Round 2)

**FAIL-06: Token compiler cross-platform visual divergence** (HIGH)

The Phase 1 gate claims "identical visual output" across web and Flutter, but provides no mechanism to verify. CSS `rem`, Tailwind spacing, and Flutter logical pixels use different measurement systems. Subtle rounding differences will produce near-identical but not pixel-identical output.

**Mitigation needed**: Define "identical" as "within 2px tolerance" not "pixel-perfect." Add visual comparison tooling to Phase 2 (Playwright screenshots vs Flutter golden tests). For Phase 1, verify token VALUE consistency (same numbers emitted) not rendered appearance.

**FAIL-07: AI Chat engine complexity underestimated** (HIGH)

The AI Chat engine (Kaizen integration) is Sprint B3/C3 — the last sprint, scheduled alongside page templates and platform extensions. It requires streaming SSR, tool call rendering, citation linking, conversation branching, and action plan UX. This is at least as complex as DataTable, yet shares a sprint with 11 page templates, Next.js extensions, and Tauri extensions.

**Mitigation needed**: Split Sprint B3 into B3a (AI Chat engine — dedicated) and B3b (templates + extensions). If Phase 1 runs long, B3b can be deferred to Phase 2 without losing the Kaizen integration, which the value audit identified as the strongest product-market fit.

**FAIL-08: Starter themes are generic, customization path unclear** (MEDIUM)

Three starter themes (enterprise, modern, minimal) are the only design options. No token editing workflow, theme extension guide, or partial override mechanism exists. Users either accept a theme wholesale or write raw YAML.

**Mitigation needed**: Add to Phase 1 Workstream A: "Theme customization guide" — a document showing how to modify a starter theme (change primary color, adjust spacing scale, swap typography). This is guidance, not tooling, and can be a skill sub-file.

**FAIL-09: Layout grammar rigidity** (MEDIUM)

The grammar's 6 primitives and 11 templates cannot express every real-world layout (sticky headers, animated sidebars, drag-and-drop zones, overlay-heavy workflows). No escape hatch exists.

**Mitigation needed**: Add a `Custom` layout primitive that accepts raw CSS/Flutter layout code. The agent uses this when grammar primitives don't fit — preserving token adherence on content while allowing custom layout. Document the escape hatch in the composition grammar skill so agents know when to use it.

---

## 4. Consolidated Action Items

| # | Action | Priority | Where |
|---|--------|----------|-------|
| 1 | Standardize "Stack" naming (not "VStack") across specs | LOW | spec 08, verify elsewhere |
| 2 | Define compiler MVP as the Sprint 1 unblocking deliverable | HIGH | plan Workstream A |
| 3 | Budget Sprint B1/C1 at 2 sessions (not 1-2) | HIGH | plan parallel execution map |
| 4 | Add auto-proceed criteria for decision gates (4h max human latency) | MEDIUM | plan gate definitions |
| 5 | Add "within 2px tolerance" definition for cross-platform token fidelity | HIGH | plan Phase 1 gate |
| 6 | Split Sprint B3 into B3a (AI Chat) and B3b (templates + extensions) | HIGH | plan Workstream B |
| 7 | Add theme customization guide to Workstream A | MEDIUM | plan Workstream A |
| 8 | Add Custom layout escape hatch to grammar | MEDIUM | specs/layouts/grammar.yaml |
| 9 | Move composition grammar earlier in Workstream D (Session 2-3 not 4) | HIGH | plan Workstream D |
