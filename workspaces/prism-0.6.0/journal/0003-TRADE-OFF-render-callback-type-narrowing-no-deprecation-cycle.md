---
type: TRADE-OFF
date: 2026-05-03
created_at: 2026-05-03T07:05:00Z
author: agent
project: prism-0.6.0
topic: render callback value-type narrowing ships without deprecation cycle
phase: todos
tags: [breaking-change, types, deprecation, columndef]
---

# `ColumnDef.render` value-type narrowing ships in 0.6.0 without deprecation cycle

## Context

Issue #25 requires widening `ColumnDef.render`'s `value` parameter from `T[keyof T] | undefined` to `unknown`. This is technically a **type-level breaking change**: consumers whose render callbacks destructure or narrow the typed `value` parameter (e.g. `render: (value, row) => value.toLocaleString()`) will see TypeScript errors after upgrade. Runtime behavior is unchanged — every shipped consumer call site already uses `value ?? defaultValue` pattern (per agent-B sweep).

The question: do we deprecate the old signature for one minor cycle (per `zero-tolerance.md` Rule 6a) before changing it, or ship the change in 0.6.0 directly?

## Options considered

### Option A — Ship the type narrowing in 0.6.0 (chosen)

Land the new signature directly. CHANGELOG documents the migration: consumers see TS errors; fix is one of:

- Keep callback as-is — TS infers `unknown`; if value is read, cast (`value as Foo`) or guard (`typeof value === "string" && ...`).
- Most consumers already use `value ?? default` which handles `unknown` gracefully (no fix needed).

### Option B — Add a deprecation cycle (rejected)

Introduce a generic param `ColumnDef<T, V = T[keyof T] | undefined>` so existing render signatures keep their narrow type and synthetic-column consumers opt into `V = unknown`. Deprecate the default in 0.6.0; remove in 0.7.0.

**Rejected because:**

1. The change is a TYPE-only narrowing — no runtime behavior change, no symbol removal, no kwarg drop. `zero-tolerance.md` Rule 6a was scoped to public-API REMOVAL (kwargs dropped, symbols deleted, signatures broken at runtime). Type widening + render-value re-typing is not in that scope.
2. The deprecation parametrisation `ColumnDef<T, V>` adds a permanent generic the API didn't need. The cost is paid forever; the benefit (smoother 0.6.0 → 0.7.0 transition) is one cycle.
3. Every shipped consumer call site already handles `unknown` via coalesce or guard — the actual fix-rate is near zero. Even consumers that destructure (e.g. `(value, row) => value.foo`) will fail loudly at type-check time, not silently at runtime — the loud failure IS the migration signal.
4. Adding a generic for one cycle and removing it is itself a breaking change in 0.7.0 — net-zero on breakage count, with extra complexity in between.

## Decision

Ship the type narrowing in 0.6.0 as a single clean change. Document migration in CHANGELOG with three concrete examples:

- "Already-coalesced": `(value) => value ?? "—"` → no change needed
- "Destructured": `(value, row) => value.toLocaleString()` → cast: `(value, row) => (value as number).toLocaleString()`
- "Synthetic-field new pattern": `(_value, row) => <ProfileBar pct={profileCompleteness(row)}/>` — works as-is, type widens to support the new use case

## Risk register

| Risk                                                                                     | Mitigation                                                                                                                       |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Consumer compile breakage on upgrade                                                     | CHANGELOG migration section with the 3 examples; release notes flag the change as type-narrowing                                 |
| Some consumers may not see the type change until they actually compile (e.g. CI-only TS) | Acceptable — TS fail is visible at consumer-side CI; not a runtime risk                                                          |
| Cumulative type-narrowing across releases creates fatigue                                | 0.6.0 is the first release that narrows render type; document a policy in CHANGELOG that future releases prefer additive changes |

## Connection to `zero-tolerance.md` Rule 6a

Rule 6a is about public-API REMOVAL (kwargs dropped, symbols deleted). It is NOT about additive type widening that necessitates consumer-side cast-or-guard at recompile. The render value-type widening is the latter category.

Counter-position: if the user disagrees and considers this a 6a-class change, the alternative is Option B (parameterised generic, one-cycle deprecation). User decision at /todos approval gate.

## For Discussion

1. **Counterfactual** — if we instead chose Option B, what's the cost? Concrete: a permanent `<T, V = ...>` generic on `ColumnDef`, ~3 type changes per consumer call site that previously didn't need to think about `V`, and a 0.7.0 follow-up to remove the dual-typed shim. We saved one cycle of consumer error (~3 lines per consumer if they hit it) at the cost of permanent API surface complexity and a future breaking change. Worth the trade?
2. **Specific data** — agent-B's call-site sweep found ZERO unguarded `row[col.field]` reads in the engine. Among arbor's 4 `*-prism` consumers, render callbacks all use either `value ?? default` or read from `row` directly. If the actual breakage count is near zero, is the deprecation cycle solving a non-problem?
3. **Policy question** — should this set a precedent for future Prism releases — "type narrowings ship clean; runtime changes get deprecation cycles" — or is each case judged independently? The former gives consumers predictable migration shape; the latter preserves judgment for edge cases. Recommend: clean type narrowings + Rule 6a for runtime / symbol-removal changes, document the split in CHANGELOG philosophy.
