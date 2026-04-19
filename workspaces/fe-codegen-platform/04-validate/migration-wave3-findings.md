# Migration Wave-3 — Arbor on Prism 0.3.1 (findings)

**Scope**: Upgrade arbor's two existing prism routes (`/documents-prism`,
`/my-payslips-prism`) from the 0.2.0 consumer-owned-fetch patterns to the
0.3.1 contracts: `DataTableAdapter` as the sole data shape, `Card` +
`CardGrid` atoms/organisms, and `DataTable display="card-grid"` mode.
ServerDataSource-era orphans removed.

**Target repo**: `~/repos/terrene/contrib/arbor/apps/web/`
**Prism version**: `@kailash/prism-web` 0.2.0 → 0.3.1 (via `/tmp/kailash-prism-web-0.3.1.tgz`)

**Type check**: `npx tsc --noEmit` — zero errors on a fresh install.
**Test run**: `npx vitest run` — 43/43 tests passed (5 files, 1.40s).

---

## LOC delta (verified)

Per `rules/testing.md` § "Verified Numerical Claims" — produced by
`wc -l` against both trees and `git diff --stat` across the arbor
working tree.

### Documents migration (M-03 wave-3)

| File                                | Pre (0.2.0) | Post (0.3.1) | Δ     |
| ----------------------------------- | ----------- | ------------ | ----- |
| `documents-prism/page.tsx`          |         579 |          650 |   +71 |
| `components/prism-document-card.tsx`|         200 |      deleted |  −200 |
| `lib/prism-documents-datasource.ts` |         123 |          123 |    ±0 |
| **Total**                           |     **902** |      **773** | **−129 (−14%)** |

### Payslips migration (M-02 wave-3)

| File                                 | Pre (0.2.0) | Post (0.3.1) | Δ     |
| ------------------------------------ | ----------- | ------------ | ----- |
| `my-payslips-prism/page.tsx`         |         180 |          204 |   +24 |
| `my-payslips-prism/elements/columns.tsx` |      92 |           56 |   −36 |
| `lib/prism-payslips-datasource.ts`   |         448 |          362 |   −86 |
| **Total**                            |     **720** |      **622** | **−98 (−14%)** |

### Combined

- `git diff --stat` across the five touched files: **543 insertions, 770
  deletions** (net **−227 LOC** in arbor).
- One deleted component (`prism-document-card.tsx`).
- One deleted orphan function (`makePayslipsServerDataSource` — imported
  symbols removed from Prism in 0.3.0).

---

## What worked (0.3.1 contracts validated)

### 1. `DataTableAdapter` — single shape, predictable lifecycle

Both pages now pass an adapter object to `data:` instead of a fetched
array + a parallel `useState/useEffect` loop. The engine owns:

- Fetch lifecycle (initial load, refetch on sort/filter change, retry).
- Loading / error / empty state rendering.
- AbortController-driven cancellation of superseded fetches.
- Sort state (engine sorts the adapter's page response when
  `capabilities.sortableFields` is empty).

What the adapter owns is now exactly the adapter's job — data source
specifics, row identity, action handlers. The page shell is shorter and
has no parallel state machine.

### 2. `onExecute: async (row) => ...` — engine-managed busy state

Payslips' download button was previously a custom column with a
`downloadingId` useState, an onClick handler, a conditional "Opening…"
label, and a manual disabled prop. In 0.3.1 it is an adapter
`rowAction` with `onExecute: async (row) => downloadPayslipPdf(row.id)`.
The engine detects the returned promise and drives the busy state itself.
This eliminates the `downloadingId` state, the Download column's
`render` callback, and the synchronous-wrapper `handleDownloadSync`
callback — about 25 LOC of glue deleted.

### 3. `display="card-grid"` + `renderCard` — single rendering path

Documents previously had two completely separate render branches — a
`<DataTable ... />` for list view and a hand-rolled `<Grid>...{items.map
((r) => <PrismDocumentCard t={r}/>)}</Grid>` for grid view, each with
its own loading/error/empty state copy-paste. In 0.3.1 both views route
through `<DataTable display={view === "grid" ? "card-grid" : "table"}
renderCard={renderDocumentCard} .../>`. The engine handles state
uniformly; the renderCard is ~70 LOC (vs the 200-LOC card component it
replaced) because title / subtitle / footer slots come from the Card
atom and rowActions auto-render in the footer.

### 4. `rowActions` as declarative data on the adapter

Documents' Preview / Generate buttons used to be ~30 LOC of JSX
(`<Link><Button/></Link>` pairs) inside a `render` callback on the
`id` column. In 0.3.1 they are a `readonly` array of
`DataTableRowAction<T>` on the adapter:

```typescript
const rowActions = [
  { id: "preview",  label: "Preview",  variant: "ghost",   href: (row) => `/documents/${row.id}/preview` },
  { id: "generate", label: "Generate", variant: "primary", href: (row) => `/documents/${row.id}/generate` },
];
```

The same array drives BOTH table-mode's actions column and card-grid
mode's card footer. Zero duplication across modes.

### 5. Shared state between view modes via memoized adapter

The adapter is `useMemo`ed on `(templates, activeCategory, search)`.
Switching view modes does not change those deps, so the adapter
instance is stable and the engine does not refetch. Changing the
category or search string triggers an adapter recreation → engine
refetch → re-filter against the cached `templates` array. No network
refetch; no wasted re-render of the unchanged view mode.

---

## What didn't (gaps surfaced for 0.4.0+)

### G-1: `DataSource<T>` fixes TId to `string`

`DataTableAdapter<T, TId>` accepts a typed `TId` parameter but the
`DataSource<T>` union (`T[] | DataTableAdapter<T>`) that `DataTableConfig.data`
accepts does not forward it. Consumers with numeric PKs have two options:

- Stringify at the adapter boundary (`getRowId: (row) => String(row.id)`).
- Drop TId altogether (default `string`).

Neither is broken; both require a mental note. The payslips migration
took option A. Suggested 0.4.0 fix: propagate TId through `DataSource`,
`DataTableConfig`, and `DataTable` generics so
`DataTable<PayslipRow, number>` works end-to-end.

### G-2: External filter state still lives in the page, not the engine

DataTable's globalSearch state is internal and cannot be driven
externally (no `initialGlobalSearch` prop, no `onGlobalSearchChange`
controlled-input pattern). Pages that want a custom filter bar
(chip row + arbor-specific search input) must:

1. Hold search state at the page level.
2. Disable DataTable's built-in search
   (`filtering={{ globalSearch: false }}`).
3. Pipe the search string into a memoized adapter so the engine
   refetches.

This works but costs ~6 LOC of memoization and one `useMemo` dependency
array per consumer. A proposed `FilterBar` molecule (from M-03
findings) or a controlled-input pattern for DataTable's internal search
would collapse this.

### G-3: Adapter errors lose type info at the engine boundary

The engine catches any `throw` from `fetchPage` and surfaces
`err.message` through its errorState. Typed errors (e.g.
`PayslipDownloadBlockedError implements UserFacingError`) lose their
type information because the engine's error channel is
`string | null`. For now, consumers wrap throws with
`new Error(sanitizeErrorMessage(err))` so the message is clean —
but an adapter that wants to signal "retry is disabled" or "reauth
required" has no structured channel. Proposed 0.4.0 fix: a typed
`AdapterError` shape with `retryable: boolean` and `userFacing: boolean`
the engine honors.

### G-4: No column-level sort customization without re-implementing the comparator

The adapter's `fetchPage` receives `query.sort` but has to implement
the full three-case comparator (numeric vs string vs null) itself.
Every adapter now has a ~15-LOC generic sort block. Either the engine
should ship a `defaultSortComparator(rows, sort)` utility or
`capabilities()` should include a "use engine default sort" flag.

### G-5: `DataTable.onRowClick` fires for card-mode too — verify intent

The documents migration wires `onRowClick` which, in card-grid mode,
becomes the Card's `onActivate` handler. This preserves the wave-2 H3
fix (row-body click navigates to preview) but was not explicitly
documented in Prism's 0.3.1 CHANGELOG. Worth adding a one-liner that
`onRowClick` → `onActivate` in card mode so consumers don't re-invent
the wiring.

---

## Wave-2 redteam fixes preserved

Each wave-2 security / parity fix was re-verified through the refactor:

| # | Origin | Fix location (post-wave-3) | Status |
|---|--------|----------------------------|--------|
| H3 | wave-2 redteam | `documents-prism/page.tsx::DataTable.onRowClick` → `router.push(/preview)` — also drives Card.onActivate in card-grid mode | PRESERVED |
| M4 | wave-2 redteam | `prism-documents-datasource.ts::applyClientFilters` — search scope is still `name | description`, not `category` | PRESERVED |
| M5 | wave-2 redteam | `prism-documents-datasource.ts::deriveCategories` — `CURATED_CATEGORY_ORDER` still emits `[Contracts, Policies, Letters, Forms, ...unknown]` | PRESERVED |
| S1 | wave-2 redteam | `prism-payslips-datasource.ts::debugLog` — payslip_id only at dev-only DEBUG; adapter layer adds no new logging | PRESERVED |
| S2 | wave-2 redteam | Both adapters wrap fetchPage errors: `throw new Error(sanitizeErrorMessage(err))` | PRESERVED |

---

## Orphan-detection sweep

Per `rules/orphan-detection.md` Detection Protocol — applied against
the five changed files:

| # | Check | Result |
|---|---|---|
| 1 | Removed-API test files deleted with the API | PASS — `makePayslipsServerDataSource` deleted; no imports from its tests (none existed) |
| 2 | Facade/manager-shape classes with no call site | PASS — no `*Manager` / `*Executor` / `*Store` / `*Registry` / `*Engine` / `*Service` exposed |
| 3 | Deprecated symbols left as "compat" placeholders | PASS — `PrismDocumentCard` deleted (not deprecated); `ServerDataSource` imports deleted (not suppressed) |
| 4 | `pytest --collect-only` / `vitest --list` fails | PASS — `npx vitest run` collects 43/43 tests cleanly |

---

## Prism-side disposition

Two Prism-side findings from this migration should land as issues /
future-wave tracking:

1. **G-1 (TId propagation)** — small API refactor; proposed for 0.4.0.
2. **G-4 (defaultSortComparator utility)** — small ergonomic win;
   proposed for 0.3.x patch release.

G-2, G-3, G-5 are either documented workarounds or doc-only fixes; can
roll into the next spec polish pass.

---

## Resolved stale spec references

Redteam LOW-1 from `redteam-remove-server-data-source.md` pointed at
`specs/components/data-table.yaml` describing the pre-execution
deprecation plan. Fixed in this session:

- `design_decisions.serverDataSource_deprecation` — updated from
  `"one-release window: deprecate M-06, remove 0.2.0"` to
  `"two-release window: deprecated in 0.2.2, removed in 0.3.0"`.

LOW-2 (`docs/specs/05-engine-specifications.md` DD-5 bullets) was
already resolved before this session — the block at L710-720 now
reads `0.2.0 (M-04) wired` → `0.2.2 (M-06) deprecated` → `0.3.0
(Shard 3) removed`.

LOW-3 (CHANGELOG test count `20 cases` vs actual `22`) was also
already resolved — CHANGELOG L111-112 now says `22 cases (down from
24 in 0.2.2)`.

---

## Closing note

Wave-3 validated that the 0.3.1 contracts deliver the architectural
promise without compromise on the wave-2 parity fixes. The raw LOC
savings (~14% per route, ~227 LOC total across the two routes) are
modest; the structural savings are material: the dual list/grid
render branch collapses into a single `<DataTable display=...>`, the
local card component deletes, the download state machine deletes, and
every rowAction / filter / search concern routes through typed adapter
interfaces instead of ad-hoc useState plumbing.

The larger LOC savings the M-03 adapter sketch estimated (~50 LOC
instead of ~450) assumed a `FilterBar` molecule landing alongside the
adapter. That molecule is still a 0.4.0 target; without it, the filter
chip row + external search input stay at the page level. G-2 above
tracks this for the next wave.

---

## Session

**Session**: 2026-04-19 (wave-3 migration)
**Prism versions**: source tree 0.3.1; arbor consumed 0.2.0 → 0.3.1
**Arbor diff**: 5 files, 543 insertions, 770 deletions
**Verification**: `npx tsc --noEmit` clean; `npx vitest run` 43/43 passed
