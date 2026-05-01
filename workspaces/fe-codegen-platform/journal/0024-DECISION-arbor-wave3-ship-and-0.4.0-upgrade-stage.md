---
type: DECISION
date: 2026-04-28
created_at: 2026-04-28T11:30:00+08:00
author: co-authored
session_id: arbor-wave3-ship-and-040-upgrade-2026-04-28
session_turn: post-stage
project: fe-codegen-platform
topic: Wave-3 closure via cherry-pick PR #17; 0.4.0 upgrade staged on top; React 19 lint refactor
phase: implement
tags: [arbor, wave-3, prism-0.4.0, kitchen-sink-branch, cherry-pick, react-query, lint-refactor]
---

# 0024 — DECISION — Arbor wave-3 closure via cherry-pick + 0.4.0 upgrade staged + React 19 lint refactor

**Status**: Wave-3 in flight (PR #17 OPEN, mergeable). 0.4.0 upgrade staged locally.

## Context

Picked up the deferred workstream from `0023-DECISION-redteam-convergence-round2-clean.md`'s "Outstanding work" #4 — arbor wave-4 was blocked because wave-3 had never landed. Session notes claimed the work was stashed; reality was 15 commits sitting on `feat/prism-advisory` with uncommitted wave-3 polish in the working tree, targeting Prism **0.3.1** (not 0.4.0).

## Three findings

### 1. The kitchen-sink branch problem

`feat/prism-advisory` had accumulated **15 commits** across multiple sessions:
- 2 Prism waves (wave-1 advisory, wave-2 calculators+docs+payslips)
- 3 CoC syncs (3.4.8 → 3.4.9 → 3.5.0 → 3.5.1)
- 3 security/infra hardening (executor cleanup, rate limit validation, Redis password redaction)
- 1 load-test rework (T209 K8s staging)
- 4 various fixes (Ollama fallback × 2, async deprecation, lint suppression)
- 1 test fixture cleanup
- 1 journal doc

`origin/main` had moved 2 commits forward — superficially "trivial drift" — but the drift was on `pyproject.toml` and `uv.lock`: origin/main bumped SDK floors (kailash 2.8.6 → 2.8.9, dataflow 2.0.8 → 2.0.12, etc.), branch added Python 3.14 classifier + adversarial/timeout pytest markers. **6-file conflict** on rebase including `pyproject.toml` + `uv.lock`. The branch had become unrebasable in the cheap sense.

### 2. Cherry-pick is the right escape hatch

Cherry-picking just the 3 Prism commits (wave-1 + wave-2 + wave-3 polish) onto `origin/main` → **zero conflicts** on a fresh `feat/prism-waves-1-2-3` branch. Pushed as PR #17.

The 12 maintenance commits stay orphaned on `feat/prism-advisory`. They're not wave-3's problem; they need their own PR(s) once the dep drift is reconciled. This is honest about provenance (each PR carries one topic) and unblocks wave-4.

### 3. Wave-3 stayed at 0.3.1 deliberately

Prism is at 0.4.0; wave-3 polish targets 0.3.1. Per CHANGELOG, 0.4.0 is non-breaking on the consumer surface (G-1 typed `TId` defaults to `string`; G-2 controlled `globalSearchValue` is opt-in). Shipping wave-3 at 0.3.1 separates "code that already works" from "validate 0.4.0 non-breaking promise on real consumer code" — one PR proves wave-3 ships, one PR proves the upgrade.

## What landed

**PR #17 (`feat/prism-waves-1-2-3`)** — 4 commits, mergeable:
1. `90dc17f` wave-1 advisory route
2. `519ff97` wave-2 calculators + docs + payslips Prism variants
3. `b964437` wave-3 DataTableAdapter migration on 0.3.1 (single commit, ~600 LOC churn)
4. `eeb1ce1` React 19 lint compliance (useQuery + derived state)

**`feat/prism-0.4.0-upgrade` (local-only)** — 2 commits, on top of #17:
1. `1a18eb9` `@kailash/prism-web` 0.3.1 → 0.4.0 (lockfile delta only; +5/-5)
2. `3b2dedc` G-1 typed `TId` simplifications — drops `String(row.id)` at 7 callback sites in documents-prism + my-payslips-prism

Verified at every gate: `tsc --noEmit` clean, `eslint` clean on touched directories, `vitest` 43/43.

## React 19 lint refactor — the suppress-vs-fix decision

`eslint` flagged 2 `react-hooks/set-state-in-effect` errors in wave-2's `documents-prism/page.tsx`:
- Line 477: `fetchAllDocumentTemplates().then(setTemplates)` inside `useEffect` — classic fetch-then-setState
- Line 498: `setActiveCategory("All")` inside `useEffect` when categories change — derived-state-in-effect

`feat/prism-advisory` had a `4c3a701 chore(web): suppress 31 pre-existing lint errors to unblock CI` commit we deliberately excluded from the cherry-pick. Cherry-picking that commit was tempting (would unblock CI immediately) but **blocked by `zero-tolerance.md` Rule 1**: "ANY acknowledgement, logging, or documentation without an actual fix" — `eslint-disable` comments fall on the wrong side.

Fixed both with real refactors:
- Error 1 → migrate to `useQuery` from `@tanstack/react-query` (already a project dep, wired via `Providers.tsx`). Replaces 18 lines (3 useStates + useEffect + cancelled-flag dance) with 6 lines. Net code reduction.
- Error 2 → derive `effectiveCategory` during render. `setActiveCategory` remains for user-driven chip clicks; the auto-fallback is now a pure expression.

Net diff: -10 LOC, zero behavior change, lint clean. The "real fix is cheaper than the suppression" pattern played out exactly as zero-tolerance Rule 1 promises.

## What stays orphaned (for next session)

- **12 maintenance commits on `feat/prism-advisory`** — security/infra, CoC syncs, Ollama fallback, load tests, lint suppression. Need their own PR(s) once the `pyproject.toml`/`uv.lock` drift is reconciled. They are not blocking wave-4.
- **0.4.0 upgrade branch is local** — needs to ship after PR #17 squash-merges. Will require one rebase onto the squashed commit; rebase is conflict-free (G-1 changes and lint refactor touch disjoint regions of `documents-prism/page.tsx`).
- **G-2 controlled `globalSearchValue` not applied** — `/documents-prism` pairs its search input with category chips inside a custom filter bar; lifting search into engine-rendered chrome would split that composition. The page already controls its input the React-idiomatic way; G-2's actual use case is parent-owned URL/store state, which doesn't apply here.

## What changes for the wave-4 plan

`01-analysis/arbor-wave4-route-selection.md` recommended `/clients` against Prism 0.4.0. That recommendation stands. Wave-4 starts when:
1. PR #17 merges (waiting on user approval)
2. 0.4.0 upgrade PR ships (rebase + push the local branch)
3. Then `/clients` migration can begin on a clean 0.4.0 base

## For Discussion

1. **Counterfactual**: If the Phase 5.11 / orphan-detection rule had a sibling rule "no kitchen-sink feature branches — when a topic shifts, branch off main" — would `feat/prism-advisory` ever have accumulated 15 mixed commits? Or is the kitchen sink an inevitable byproduct of multi-session AI work that resists splitting, and the cure is at the cherry-pick stage rather than the branch-creation stage?
2. **Data**: Cherry-pick of 3 commits onto current `origin/main` produced **zero conflicts**, while merge of all 15 produced 6-file conflicts including `pyproject.toml` + `uv.lock`. The arithmetic suggests the conflict surface scales with the union of touched files across non-Prism commits, not with the count of Prism commits. Does this generalise — "for any kitchen-sink branch, the safe shippable subset is whatever cherry-picks clean against current main"?
3. **Lint refactor cost**: The "real fix" path took ~10 minutes of edit + verify time and produced net -10 LOC. The "cherry-pick the suppression commit" path would have taken ~30 seconds and produced net 0 LOC + a documented suppression. Is there a class of lint rule (the `react-hooks` family in particular) where the suppression-vs-fix calculus actually favors fixing because the fix is genuinely smaller? Or is this an outlier and most suppressions are cheaper?
