# DECISION: Arbor wave 2 defers FormAdapter and DataTableAdapter implementation to next wave

**Date:** 2026-04-14
**Wave:** arbor migration #2 (calculators + payslips + documents)

## Context

Three parallel migrations surfaced two engine-level API gaps that both migration agents and the red-team pass independently flagged as high-value:

- **FormAdapter** (M-01 BLOCKING-2) — Form has no post-submit result concept, so every consumer re-implements the `{values, result}` state machine in the page. A consumer-collapsing adapter analogous to `ChatAdapter` would remove ~100 LOC of boilerplate per Form consumer.
- **DataTableAdapter** (M-02 + M-03 convergent finding) — `ServerDataSource` is declared but never invoked by the engine, and both sketched adapters merged cleanly into a 9-method design (3 required + 6 optional).

The temptation was to implement BOTH adapters in M-04 alongside the blocking fixes.

## Decision

**Defer both adapter implementations to next wave. Ship Prism 0.2.0 with narrow blocking fixes (D1-D4, F1-F4) and the DataTableAdapter design doc only (no code).**

## Rationale

1. **Shard discipline** (rules/autonomous-execution.md) — ≤500 LOC load-bearing, ≤5-10 invariants, describable in 3 sentences. Adding both adapters would have pushed M-04 well past the budget and put the migration at risk. Splitting preserved the convergence guarantee.

2. **Design convergence first** — The two DataTableAdapter sketches from M-02 and M-03 were similar but not identical. M-05 (analyst) produced a merged design that makes intentional choices (capabilities required not optional; rowActions as static-array-with-predicates; mapRow dropped in favor of relaxed row constraint). Landing that design as a spec gives the next wave a clean target; implementing without the design would have produced a less-defensible API.

3. **Real consumers still needed** — The two Form consumers (calculators) and two DataTable consumers (payslips, documents) gave useful but limited signal. The next wave (leave, claims, employees) will produce server-paginated consumers, which is where the adapter interfaces' capabilities-and-fallback logic earns its keep. Designing without those consumers risks over-fitting to the current three.

4. **The blocking fixes alone restore API honesty** — D1 wires `ServerDataSource.fetchData` so the existing contract is no longer a Rule 2 orphan. F1–F4 give every current consumer an escape hatch. The adapter is the NEXT level of ergonomics, not a prerequisite for correctness.

## User impact

- Prism 0.2.0 ships now with working DataTable server-side fetch, new Form slots, and a published adapter design target for the next wave.
- Arbor's three wave-2 routes are production-shaped code (no adapter workarounds required at the API surface, only the agreed-upon design-pattern-not-library shape).
- Next wave downstream migrations will write against `DataTableAdapter`, not against `ServerDataSource`. `ServerDataSource` will be deprecated in 0.2, removed in 0.3 per M-05's deprecation plan.

## Follow-ups

- Next wave task: implement `DataTableAdapter` (9 methods, 3 required) + `FormAdapter` + codemod for existing `ServerDataSource` consumers (which is zero in practice today).
- Policy decisions still owed:
  - Tarball distribution — `/tmp/` is not a production-viable path.
  - Documents API role-scoping — needs arbor backend verification.
