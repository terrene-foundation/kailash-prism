---
type: DECISION
date: 2026-05-03
created_at: 2026-05-03T06:50:00Z
author: co-authored
project: prism-0.6.0
topic: scope decision — ship two features, defer third
phase: analyze
tags: [release, scope, filter-bar, synthetic-columns]
---

# Prism 0.6.0 ships with two features (#24 + #25); no third gap qualifies

## Decision

Ship 0.6.0 with exactly two features:

1. `FilterBar` molecule + `useFilterBarState` hook (issue #24)
2. `ColumnDef.field` relaxation + sortable-synthetic runtime guard (issue #25)

No third feature added. Wave-6 will surface the next 0.6.1 / 0.7.0 candidate.

## Alternatives considered

| Alternative                                                               | Verdict  | Reason                                                                                                                                         |
| ------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Add BLOCKING-1 (ServerDataSource wire-through)                            | REJECTED | Stale finding — `ServerDataSource` was removed in 0.3.0; the wiring problem no longer exists.                                                  |
| Add BLOCKING-2 (Form result render slot)                                  | REJECTED | FormAdapter design exists in journal 0004; implementation is M-05 scope. Bundling would require Form engine work that doubles release surface. |
| Add typed renderer library (BadgeRenderer etc.)                           | REJECTED | 2 consumers — below the "3+ recurring" bar; better as separate molecule package.                                                               |
| Add Layout engine consumer migration (H-2)                                | REJECTED | Architectural debt, not API gap. Out of scope for an API-feature release.                                                                      |
| Promote derive-options + effective-fallback patterns to separate features | REJECTED | They are properties OF FilterBar, not separate gaps. Absorbed into `useFilterBarState` API.                                                    |

## Rationale

1. The brief named "0.6.0/0.6.1 ping-pong" as the risk to bundling. We accept ping-pong over rushing a third feature.
2. The two filed candidates are mature: #24 has 3+ consumer evidence + concrete API shape; #25 is a 4-line-level type change with already-safe runtime call sites.
3. No third candidate is structurally ready. Each rejection above traces to a specific staleness, scope-mismatch, or premature signal.
4. Wave-6 reduces the search cost of the next 0.6.x feature from "speculate now" to "observe a real consumer hit it" — same discipline that produced #24 (3 consumers) and #25 (1 hard block + recurring class).

## Consequences

- 0.6.0 ships ~700 LOC across `web/src/` (estimate per `02-plans/01-prism-0.6.0-design.md` shard plan).
- 0.6.0 → 0.6.1 cycle is acceptable; the brief explicitly authorised this trade.
- `DataTableAdapter.filterDimensions` stays vapourware. Per orphan-detection rule, do not implement until a consumer demands it.
- Wave-6 unblocks: shippable as soon as 0.6.0 is published.

## Follow-up actions

1. `/todos` against `02-plans/01-prism-0.6.0-design.md` shard plan (4 shards).
2. After 0.6.0 ships: resume arbor migrations, observe wave-6 surface for the 0.6.1 candidate.
3. Watchlist: BLOCKING-2 (Form result slot), BLOCKING-1 in M-01 (Form custom field render), typed renderer library — see `01-analysis/03-third-gap-investigation.md` § Watchlist.

## For Discussion

1. **Counterfactual** — if wave-6 surfaces a Form-side gap (BLOCKING-2 or BLOCKING-1), do we cut 0.7.0 with Form features rather than 0.6.1? The alternative is a 0.6.x line that grows DataTable features and a 0.7.0 that opens the Form line. Which sequencing is cleaner for downstream consumers?
2. **Specific data** — three of the four `*-prism` consumers (documents, clients, employees) hit the "derive options from data" pattern; two hit the "effective fallback" pattern. Should we surface these in the FilterBar API even when the consumer doesn't need them, or expose `useFilterBarState` overloads for the simpler cases (search-only, like my-payslips)?
3. **Premature optimisation check** — the runtime `sortable + synthetic` throw catches a latent silent-wrong-sort bug. Is "throw" the right disposition, given the brief left runtime contract as a `/analyze` decision? An alternative is `console.error` + skip-the-sort, which is less aggressive but lets a buggy column ship to production. We chose throw; is the user comfortable with the strict stance?
