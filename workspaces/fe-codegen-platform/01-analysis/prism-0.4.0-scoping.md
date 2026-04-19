# Prism 0.4.0 Scoping — Arbor Wave-3 Gaps

**Input**: `workspaces/fe-codegen-platform/04-validate/migration-wave3-findings.md` (G-1..G-5)
**Grounding**: `web/src/engines/data-table/{types.ts, adapter.ts, use-data-table.ts, data-table-root.tsx, data-table-body.tsx, index.ts}` at 0.3.1
**Date**: 2026-04-19
**Scope**: 0.4.0 recommendation — no code changes in this document.

---

## Executive summary

Five gaps surfaced in wave-3. Two are doc-only. Three are real code changes, all modest: one type-only refactor (G-1) and two small ergonomic additions (G-2, G-4). G-3 (typed adapter errors) is the only non-trivial design decision and should be deferred to 0.5.0 because it bleeds into the engine's error-state contract and deserves its own shard once we have 2+ consumers asking for it.

**Recommended 0.4.0 scope**: G-1 + G-2 + G-4 + G-5 (doc). **Recommended 0.5.0**: G-3 (solo). G-5 and the "intentional `onRowClick` → `onActivate` bridge" note land as a CHANGELOG/doc patch in 0.3.2 or rolled into 0.4.0 CHANGELOG.

Complexity estimate: **1 session** (0.4.0 as scoped). G-1 is mechanical type propagation; G-2 and G-4 are additive surface; all three share overlapping edit sites in `use-data-table.ts` and `types.ts`, so doing them together costs less than doing them separately.

---

## Gap-by-gap analysis

### G-1 — `DataSource<T>` fixes `TId` to `string`

**One-sentence**: `DataTableAdapter<T, TId>` is already generic but `DataSource<T>`, `DataTableConfig<T>`, and `DataTable<T>` drop `TId` at the outer boundary, so `DataTable<PayslipRow, number>` is unreachable and consumers must stringify at the adapter.

**Grounded evidence**:

- `types.ts:214` `DataTableRowAction<T, TId = string>` — TId exists.
- `types.ts:245` `DataTableBulkAction<T, TId = string>` — TId exists.
- `types.ts:279` `DataTableAdapter<T, TId = string>` — TId exists.
- `types.ts:134` `DataSource<T> = T[] | DataTableAdapter<T>` — **TId dropped**.
- `types.ts:345` `DataTableConfig<T>` — no TId parameter.
- `use-data-table.ts:109` `useDataTable<T>` — no TId parameter.
- `use-data-table.ts:194` engine stringifies every row id internally (`String(aid)`), so `selectedIds: Set<string>` at L164 is load-bearing.

**Complexity**: **small — ~0.3 session**. Type-only refactor: add `TId = string` to `DataSource`, `DataTableConfig`, `useDataTable`, `UseDataTableResult`, `DataTable`, and every sub-component that takes `DataTableRowAction`/`DataTableBulkAction` props. Runtime is untouched — the engine still coerces to string for DOM keys and the selectedIds set. The work is grep-driven ("add `, TId = string` to every generic"), not design-driven.

**Risk**: One subtle point — the engine's `selectedIds: Set<string>` cannot change shape (string-keyed selection is correct for DOM and cache stability). So TId propagates at the _callback boundary_ (`rowAction.onExecute(row, id: TId)`) but the internal selection set stays `Set<string>`. This is the same compromise `onExecute` already makes; consumers get typed `id` at the callback, engine keeps stringified identity internally. This should be explicit in the CHANGELOG.

**Dependencies**: None inbound. Is a **prerequisite** for any future work that exposes TId upward (e.g. a public selection-state API that emits typed ids).

### G-2 — External filter state lives in the page, not the engine

**One-sentence**: `globalSearch` is purely internal to `useDataTable` (no `initialGlobalSearch` prop, no `onGlobalSearchChange` controlled-input pattern), so pages with a custom filter bar pay ~6 LOC of memoization-dep plumbing per consumer.

**Grounded evidence**:

- `use-data-table.ts:156` `const [globalSearch, setGlobalSearch] = useState('')` — internal state.
- `use-data-table.ts:413` `handleGlobalSearch` — setter is engine-owned.
- `types.ts:345` `DataTableConfig<T>` has no `initialGlobalSearch` / `globalSearch` / `onGlobalSearchChange` fields.
- `use-data-table.ts:260` the adapter-path refetch effect already depends on `globalSearch` — adding a controlled source is a one-site wiring change.

**Complexity**: **small — ~0.2 session**. Add three optional `DataTableConfig` fields: `initialGlobalSearch?: string`, `globalSearch?: string` (controlled), `onGlobalSearchChange?: (q: string) => void`. Hook picks controlled value when defined, falls back to internal state otherwise. Same shape the rest of React lands for controlled inputs. No risk of breaking existing behavior because all three are optional.

**Deferred**: A full `FilterBar` molecule (what M-03 originally sketched) is **out of scope for 0.4.0** — that's a component, not an engine change, and the adapter migration didn't need it. Filing as 0.5.0 candidate.

**Dependencies**: None. Orthogonal to G-1, G-3, G-4.

### G-3 — Adapter errors lose type info at the engine boundary

**One-sentence**: The engine's error channel is `serverError: string | null` (`use-data-table.ts:173`, `:254`), so adapters that want to signal "retry disabled" or "reauth required" have no structured channel and consumers fall back to message-string matching.

**Grounded evidence**:

- `use-data-table.ts:173` `const [serverError, setServerError] = useState<string | null>(null)` — string-only.
- `use-data-table.ts:254` `setServerError(raw.slice(0, 500))` — lossy at the engine boundary.
- No `AdapterError` type exists in `types.ts`.

**Complexity**: **medium — ~0.7 session**. This is the only gap with real design surface:

1. Define `AdapterError` type: `{ message: string; retryable?: boolean; userFacing?: boolean; code?: string }`.
2. Hook detects `AdapterError`-shaped throws, stores typed form, still exposes `serverError: string` for back-compat AND new `serverErrorDetail?: AdapterError`.
3. `DataTableError` state component reads `retryable` to hide/show retry button.
4. Test the shape survives AbortError filtering.
5. Existing consumers that throw `new Error(msg)` keep working (unchanged path).

**Why deferred**: Two reasons. (1) The design decision affects the engine's public error contract, which we'd rather revisit _after_ 2+ downstream consumers ask for it (only arbor has asked so far). (2) Co-shipping it with G-1+G-2+G-4 crosses the ~500 LOC load-bearing threshold from `rules/autonomous-execution.md` § Per-Session Capacity — error-state handling is an invariant on top of existing sort/filter/paginate/select/expand/activate invariants. Better shard.

**Dependencies**: None inbound. Best shipped alone so the error contract gets proper review.

### G-4 — No default sort comparator utility

**One-sentence**: Every adapter that does client-side sort re-implements the three-case comparator (null / numeric / string) that already lives privately in `use-data-table.ts:299-327`.

**Grounded evidence**:

- `use-data-table.ts:299-327` — full generic comparator: null-first-asc / null-last-desc, numeric auto-detect via `Number()`, localeCompare fallback, direction-aware.
- Not exported anywhere: `index.ts:6-32` has no comparator symbol.
- Every adapter the migration touched replicates the same ~15 LOC.

**Complexity**: **trivial — ~0.1 session**. Extract the body of the `sortedData` useMemo (L299-327) into a pure function `defaultSortComparator<T>(rows: T[], sort: ReadonlyArray<DataTableSort>): T[]`, re-export from `index.ts`, update the hook to call it. One unit test asserting parity with the existing inline behavior. No API risk.

**Dependencies on G-1**: Comparator signature does NOT involve TId — it sorts rows, not ids. G-1 is independent and does not constrain G-4's comparator typing. The wave-3 finding speculated on this; the actual code confirms no cross-coupling.

### G-5 — `DataTable.onRowClick` fires in card-mode — intentional, doc-only

**One-sentence**: `onRowClick` routes to `Card.onActivate` in card-grid mode by design, but 0.3.1 CHANGELOG doesn't say so — pure documentation gap.

**Grounded evidence**:

- `data-table-root.tsx:122` `const effectiveRowClick = state.onRowActivate ?? props.onRowClick` — intentional bridge with adapter precedence.
- `CHANGELOG.md` 0.3.1 entry does not mention the bridge.

**Complexity**: **trivial — doc-only**. Add a one-line note to 0.3.1 CHANGELOG (retroactive clarification) OR roll into 0.4.0 CHANGELOG's "clarifications" section. No code change. Companion: add a one-liner in `types.ts` doc comment on `DataTableConfig.onRowClick` pointing to the bridge behavior.

**Classification**: **Not a 0.4.0 code scope item**. Docs-only.

---

## Cross-gap dependency map

```
G-1 (TId propagation) ────────── independent, prerequisite for future TId surfacing
G-2 (controlled globalSearch) ── independent
G-3 (AdapterError)  ──────────── independent, ships alone in 0.5.0
G-4 (sort comparator) ────────── independent (speculation about G-1 coupling is false)
G-5 (docs) ─────────────────────  independent, doc-only
```

No hard dependencies. The wave-3 finding speculated that G-1's generics might constrain G-4's comparator typing; the grounding check confirms **no coupling** — the comparator operates on rows, not ids.

Soft grouping: G-1, G-2, G-4 all edit `types.ts`, `use-data-table.ts`, and `index.ts`. Same files = one coherent shard instead of three.

---

## 0.4.0 scope recommendation

**Ship in 0.4.0** (one shard, one session):

| Gap | Work | LOC estimate |
| --- | ---- | ------------ |
| G-1 | Propagate `TId = string` through `DataSource`, `DataTableConfig`, `useDataTable`, `UseDataTableResult`, `DataTable`, sub-component props | ~40 LOC type-only churn across 7 files |
| G-2 | Add `initialGlobalSearch?`, `globalSearch?` (controlled), `onGlobalSearchChange?` to `DataTableConfig`; hook reads controlled value when defined | ~25 LOC in `types.ts` + `use-data-table.ts` |
| G-4 | Extract `defaultSortComparator` from hook, export from `index.ts`, keep hook behavior identical | ~30 LOC + 1 unit test |
| G-5 | CHANGELOG note on card-mode `onRowClick` → `onActivate` bridge; JSDoc on `DataTableConfig.onRowClick` | Doc-only |

Combined: ~95 LOC across ~7 files, all load-bearing-lite (type churn + one extract + two optional fields). Well within the `rules/autonomous-execution.md` § Per-Session Capacity envelope (≤500 LOC load-bearing, ≤5-10 invariants — this is 3 invariants: selection-string-identity, refetch-on-globalSearch-change, sort-comparator-parity).

**Defer to 0.5.0**:

- **G-3 (AdapterError)** — solo shard. Error-contract decision deserves dedicated review.
- **FilterBar molecule** — separate from G-2. A new component, not an engine change. Warrants its own analysis pass with 2+ consumers surveyed for required field types.

---

## Breaking-change audit

**G-1**: Non-breaking. `TId = string` default preserves every existing consumer's inferred types. Adapters that already declared `DataTableAdapter<PayslipRow, number>` gain propagation through to rowAction/bulkAction `id` callback params — strictly more-typed.

**G-2**: Non-breaking. All three new fields optional; default behavior (internal state) unchanged when none supplied.

**G-4**: Non-breaking. Pure additive export. Hook's internal comparator path is refactored but output is bit-identical (unit test asserts).

**G-5**: Non-breaking. Doc-only.

**Version**: 0.4.0 is **minor**, not major. No `!` breaking-change marker needed on the commit.

---

## Success criteria (0.4.0)

- [ ] `DataTable<PayslipRow, number>` compiles end-to-end with `rowAction.onExecute: (row, id: number) => ...`
- [ ] `npx tsc --noEmit` clean against arbor's wave-3 code after upgrade (TId type-param is optional so existing `DataTable<T>` calls still compile)
- [ ] `<DataTable globalSearch={q} onGlobalSearchChange={setQ} filtering={{ globalSearch: false }} />` drives refetch through adapter without `useMemo` dep-list plumbing in the page
- [ ] `import { defaultSortComparator } from '@kailash/prism-web/engines/data-table'` works and an arbor adapter using it produces identical ordering vs the bespoke inline comparator
- [ ] CHANGELOG 0.4.0 section lists G-1 / G-2 / G-4 as non-breaking additions and clarifies the G-5 card-mode bridge
- [ ] Wave-3 arbor routes (`/documents-prism`, `/my-payslips-prism`) rebuild against 0.4.0, drop the stringify-at-boundary workaround, drop the bespoke sort comparator, and show the same 43/43 vitest result

---

## Execution notes (for /todos when this is greenlit)

- **One shard**, not three. G-1 + G-2 + G-4 edit the same 3-5 files; splitting costs more plan overhead than it saves.
- **Order within shard**: G-4 first (isolated extract, no type surface change), then G-1 (type-only propagation), then G-2 (three new fields). This lets each sub-step land with a green `tsc` in isolation.
- **Regression tests**: G-4 gets one unit test asserting comparator parity. G-1 gets a compile-only type test (`expectType<number>(id)` in a `.test-d.ts` or inline in a vitest type-check block). G-2 gets one behavior test asserting controlled value overrides internal state.
- **Arbor re-verification**: after 0.4.0 tarball, rebuild arbor's two prism routes against it to confirm the three workarounds drop cleanly. This is the final gate — same pattern as wave-3.
- **G-3 deferral note**: file a 0.5.0 todo in `workspaces/fe-codegen-platform/01-analysis/` with the AdapterError sketch so it's not lost.
