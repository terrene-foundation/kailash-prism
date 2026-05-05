---
type: DISCOVERY
phase: implement
date: 2026-05-01
surfaced_during: arbor#23 (chore/prism-0.5.0-bump)
tracked_at: arbor#22
related: 0026
---

# Arbor's React 19 compiler lint debt ships silently to production

## What surfaced

`npm run lint` in arbor `apps/web/` reports 83 problems on `main` post-PR #19 — verified identical on the bump branch (zero introduced by the dep change). Breakdown:

- **~21 real bugs**: 16 × `react-hooks/set-state-in-effect`, 1 × reassign-after-render-completes, 1 × impure-during-render, 3 × `exhaustive-deps`. All compiler-detected anti-patterns that risk infinite re-render loops, hydration mismatches, or stale-closure bugs under React 19's stricter mode.
- **~10 type-safety**: `@typescript-eslint/no-explicit-any` errors. Code smell, not direct runtime bug.
- **~52 cleanups**: 48 unused vars + 2 unescaped-entities + misc. Mechanical to delete.

72 unique files affected, spanning `src/app/` (40), `src/components/` (23), `src/contexts/` (3), `tests/e2e/` (4), and assorted hooks. Not localized — touches every major arbor surface (dashboards, payroll, advisory, analytics, employees).

## Why it ships silently

`next build` does NOT gate on eslint warnings — only on type errors. The 83 findings include 31 lint "errors" but Next.js's build step treats them as informational. So the debt ships to every arbor production deploy without any CI signal.

PR #19 (just-merged) included a `fix(web): React 19 lint compliance — derived state + React Query` commit, but the cleanup was clearly partial. The remaining 21 real bugs slipped through into production yesterday and are still there today.

## Why this is a Prism-side learning

Prism is the upstream design-system layer; arbor is the first real consumer. Arbor's React 19 lint debt is NOT caused by Prism (Prism's own code passes lint clean). But it IS the kind of finding the "build engines by migrating real projects one by one, learn and improve" cycle is designed to surface:

- Future Prism consumer projects on React 19 will likely have similar hidden debt.
- Prism upgrades that pass `npm run build` don't validate consumer hygiene — they only validate Prism's API surface compatibility.
- The Prism dep-bump-PR pattern (metadata-only branch, narrow diff) is a useful diff-comparator: pre-existing consumer debt becomes visible the moment a CI hook on the bump PR runs `npm run lint`. Without the bump-PR step, the debt is invisible until someone manually runs lint.

## Implications for Prism

- **No Prism-side action required.** This is consumer hygiene, not a Prism bug or API issue.
- **Pattern to remember**: the dep-bump-PR is the cheapest mechanical diff against consumer-side lint state. Future consumer migrations should expect this same surfacing.
- **Composable improvement**: a future Prism release notes template could include a "Consumer pre-flight check" section recommending `npm run lint` before bumping, with a list of React 19 compiler rules to expect on the consumer's lint output.

## Tracking

- arbor#22 — full breakdown + acceptance criteria + 3-5 session estimate
- `trig_01J1eht5MQTdsLDpbhJ3FEqp` — 2-week nudge routine armed against arbor#22

## For Discussion

1. Should Prism's release notes template add a "Consumer pre-flight check" section guiding consumers to run `npm run lint` before adopting? Low effort, would have caught arbor#22 before it shipped.
2. Should `prism-compiler` ship an opt-in eslint plugin that pre-warns consumers on the React 19 compiler-rule subset Prism's atoms are tested against? Or is that over-reach into consumer territory?
