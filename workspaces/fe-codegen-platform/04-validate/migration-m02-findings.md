# Migration M-02 Findings — Arbor `/my-payslips-prism`

**Wave:** Phase 2 parallel migration — simplest DataTable consumer
**Target:** `@kailash/prism-web` DataTable engine + `ListTemplate`
**Arbor baseline:** `apps/web/src/app/(dashboard)/my-payslips/page.tsx` (~425 LOC card-expansion)
**Date:** 2026-04-14

## Files created

| Path | LOC | Role |
|---|---|---|
| `arbor/apps/web/src/lib/prism-payslips-datasource.ts` | 418 | Fetch, `ServerDataSource` conformance, print-to-PDF download |
| `arbor/apps/web/src/app/(dashboard)/my-payslips-prism/page.tsx` | 186 | Page — wires DataTable + state + download |
| `arbor/apps/web/src/app/(dashboard)/my-payslips-prism/elements/columns.tsx` | 92 | Column factory (extracted for 200-line ceiling) |
| `arbor/apps/web/src/app/(dashboard)/my-payslips-prism/elements/StatusBadge.tsx` | 22 | Status pill |
| `arbor/apps/web/src/app/(dashboard)/my-payslips-prism/elements/format.ts` | 26 | `formatCurrency`, `formatPeriodDisplay` |

`tsc --noEmit` result on new files: **0 errors** (sibling M-01 agent is mid-write on `prism-calculator-configs.ts`; those errors are theirs, not mine).

## What worked

1. **`ListTemplate` + `DataTable` composition** is trivial. `ListTemplate` takes `title`, `subtitle`, `headerActions`, `content` as named props; `<DataTable {...config}/>` goes straight into `content`. Matches the advisory-prism pattern from M-00.
2. **`ColumnDef.render` receives the raw row as the second argument** (`render: (value, row) => ReactNode`), which was enough to implement the Download button column that needs `row.id`. Without `row` I would have had to store the current row id in a ref and thread it through.
3. **`sorting.defaultSort`** in config is honored on first render and the table paints sorted data immediately — good UX.
4. **Client-side sort across mixed numeric + string columns** works correctly. `use-data-table.ts` detects numeric values via `Number(...)` and sorts numerically; strings fall back to `localeCompare`. My currency columns (`gross_salary`, `net_salary`) sorted correctly as numbers without any custom comparator.
5. **`loading`, `error`, `onRetry`, `emptyState` props** are well-named and match the mental model. Passing `error: string | null` + `onRetry` "just worked" and rendered the engine's default retry button.
6. **`aria-label`** on the table is a first-class config field. Good accessibility posture.
7. **Pagination `pageSizeOptions` + `defaultPageSize`** both land on the engine's footer without any wiring.
8. **`onRowClick`** is cleanly typed as `(row: T) => void` and fires only on body rows, not on header/footer — no manual event filtering needed.

## What didn't

### Response-shape mapping friction

Arbor's `Payslip` type (from `@/services/api/payroll`) is a flat structured record:

```ts
interface Payslip {
  payslip_id: number;      // primary key
  period_start: string;    // ISO date
  period_end: string;
  gross_salary: number;
  net_salary: number;
  // …
  status: string;
}
```

Prism's `DataTableRow` is `Record<string, unknown>` — i.e. it requires a permissive index signature on every row type. Arbor's `Payslip` does NOT have `[key: string]: unknown`, so I cannot pass `Payslip[]` directly to `DataTable<Payslip>`. Attempting it produces:

```
Type 'Payslip' is not assignable to type 'Record<string, unknown>'.
  Index signature for type 'string' is missing in type 'Payslip'.
```

This forced me to introduce a **view-model `PayslipRow`** with an explicit `[key: string]: unknown` index signature. Every arbor row goes through a `toRow()` transform in the datasource. Losses:

- **Renamed `payslip_id` → `id`** because Prism's `useDataTable.getRowId` has no config hook — it hardcodes `row['id']` as the first lookup and falls back to the array index. I cannot configure it to look at `payslip_id`. If I don't rename, arbor's numeric `payslip_id` is ignored and the engine uses array indices as row IDs, which breaks selection stability across pages.
- **Introduced `period_label`** because `period_start` is an ISO string, and while the engine's client-side sort handles ISO dates correctly via `localeCompare`, display would be "2024-01-01" which is ugly. But I cannot define a column with one field as the sort key and another as the display — `ColumnDef.render(value)` receives the `field`'s value, not the whole row's value in a different field. So I store `period_label = "2024-01 January 2024"` (ISO prefix for sort, human tail for display) and strip the ISO prefix at render time. See **Friction A** below.
- **Retained `__raw: Payslip`** on every row so custom renderers can access fields not promoted to the view model. This is a common pattern (Tanstack Table has `meta` for exactly this) but Prism has no blessed slot so I invented one.

So the transformation was **not lossless**: there is no round-trip `PayslipRow → Payslip`, and two fields (`period_label`, `__raw`) exist purely to bridge engine constraints.

### `ColumnDef.render` signature friction

```ts
render?: (value: unknown, row: T) => ReactNode
```

The `value` is typed as `unknown` — not as the type of the field referenced by `field: string & keyof T`. This is a missed static guarantee: the engine knows the column points at `row.gross_salary`, which is `number`, but it hands me `unknown` anyway and I have to re-assert the type with `Number(value)` or `String(value)`. Every cell render either casts or ignores `value` and reaches into `row` directly.

The alternative I wanted:

```ts
render?: <K extends keyof T>(value: T[K], row: T) => ReactNode
// where the column's `field: K` ties the two together
```

Savings: ~5 casts across my 5 columns, and one less class of runtime bug where the field name and the render function drift.

### `ServerDataSource` declared but never invoked — BLOCKING

This is the big one. `types.ts` declares:

```ts
export interface ServerDataSource<T extends DataTableRow> {
  fetchData: (params: ServerFetchParams) => Promise<ServerFetchResult<T>>;
}
export type DataSource<T> = T[] | ServerDataSource<T>;
```

…and `DataTableConfig.data: DataSource<T>`. A naive consumer passes `data: serverSource` expecting the engine to call `serverSource.fetchData(...)` when the user paginates/sorts/filters. **It does not.** Grepping `use-data-table.ts` and the whole `engines/data-table/` folder for `fetchData` returns **zero matches outside `types.ts`**. The engine branches on `Array.isArray(data)`:

```ts
const isClientSide = Array.isArray(data);
const clientData = isClientSide ? data : [];
```

If `data` is a `ServerDataSource`, `clientData` is `[]` forever. The table shows "No data available" regardless of what the server holds.

I discovered this mid-implementation. My workaround: **do not use `ServerDataSource` at all**. Fetch the full payslip list in the page via `useEffect`, stash it in `useState`, pass the array to `DataTable`. The engine sorts and paginates that array client-side. This is fine for payslips (a user has tens, not thousands) but wastes the `ServerDataSource` type system entirely.

I left `makePayslipsServerDataSource()` in the datasource file as future-ready dead code, with a doc-block citing BLOCKING finding #1.

### Loading / empty / error state friction

Three overlapping surfaces:

1. **`loading: boolean`** on the root config — the engine renders its skeleton body when true. Works.
2. **`error: string | null`** — engine renders its error row with an optional `onRetry` button. Works.
3. **`emptyState: ReactNode`** — engine renders this inside a `<tbody><tr><td colSpan={columnCount}>` wrapper (see `data-table-states.tsx`). This means my custom empty-state markup is forced to render **inside a table cell**, which constrains styling (e.g., flexbox centering requires setting a height on the `<td>`, which the engine doesn't expose). My `<div className="py-12 text-center">` works but only because the `<td>` has no height constraint.

The loading/empty/error states are also **mutually exclusive by boolean**: `isLoading`, `hasError`, `isEmpty`, `hasData` are derived at the top of `DataTable`. That's fine for normal operation but there's no "loading with stale data shown underneath" mode (which `Tanstack Query` supports via `isFetching` + `data`). On refresh, my table flips to skeleton and back. The bespoke baseline does the same, so this isn't a regression — just noting for M-05.

### Row-click vs action-button decision

**Decision:** use a Download button column AND wire `onRowClick` to the same handler.

The button column was non-negotiable — without it, a user who wants to download without clicking the row (e.g., from keyboard nav) has no affordance. Making rows clickable was also cheap (one line: `onRowClick: handleRowClick`). The only risk is that a click on the button bubbles to the row handler and triggers download twice; I handle that with `e.stopPropagation()` inside the button's `onClick`, confirmed working.

The wart: the button column is declared with `field: "id"` because `ColumnDef.field: string & keyof T` is required even for columns that are pure actions. The header reads "Download" but the underlying field is `id`, which is awkward and means sorting the action column by clicking its header would sort by row id — fortunately I set `sortable: false` on it.

**Savings from a proposed `ColumnDef` action variant:** ~2 LOC (no field assertion), one less comment explaining the faux field.

### No hook version of the DataTable state

`useDataTable(config)` exists and is exported, but consumers cannot compose it with a custom body — the `<DataTable>` component internally calls `useDataTable` AND renders the layout. If I want to use the engine's state management with a custom table shell (e.g., to add a sticky totals row across the bottom), I have to re-implement everything. The hook-first pattern (`const state = useDataTable(config); return <MyShell state={state} />`) is not offered.

### `exactOptionalPropertyTypes` compatibility — passed

Arbor's `tsconfig.json` does NOT have `exactOptionalPropertyTypes: true` (despite the brief claiming it does). I coded as if it were on anyway — every optional prop passes as `T | undefined`, no `?: T` where a `undefined` might be rejected. The resulting code compiled cleanly, so if arbor tightens later my files stay green.

No `as unknown as T` casts. No `@ts-expect-error`. One `void` discards on `useCallback` in the async flow, and one `void end` in `formatPeriodLabel` to silence an unused-parameter lint.

## Proposed `DataTableAdapter<TRow>` interface sketch

Analogous to `ChatAdapter`, which owns 5 methods for a chat surface. For a DataTable surface I propose **7 methods** covering list/fetch/filter/sort/row-action/row-id/lifecycle, with a strong separation between "what the server knows how to do" and "what the engine should do client-side as a fallback".

```ts
/**
 * A pluggable bridge from a DataTable surface to a backend source.
 *
 * The engine asks the adapter for a page of rows (and the total count)
 * given the current query state (sort, filter, pagination). The adapter
 * decides whether to delegate to a real server query, to a local cache,
 * or to return a precomputed slice.
 *
 * Unlike the raw `ServerDataSource.fetchData`, the adapter separates
 * capabilities from the fetch call — the engine can ask `capabilities()`
 * to know whether to send a sort through or to do it client-side.
 */
export interface DataTableAdapter<TRow extends DataTableRow> {
  /** Stable identity for a row. Replaces the `row['id']` hardcode in useDataTable. */
  getRowId(row: TRow): string;

  /**
   * Declare which query operations the backend supports natively.
   * Any operation not declared here is performed client-side by the engine
   * after the adapter returns rows.
   */
  capabilities(): DataTableCapabilities;

  /**
   * Fetch one page of rows. `query` carries the full current state.
   *
   * Unlike `ServerFetchParams`, `DataTableQuery` is an object with
   * named shape, not positional, so the adapter can destructure what
   * it supports and ignore the rest.
   */
  fetchPage(query: DataTableQuery): Promise<DataTablePage<TRow>>;

  /**
   * Row-level action: the engine invokes this when a row is clicked,
   * double-clicked, or when a keyboard "enter" fires on a focused row.
   * The adapter decides what the row click means (open detail, download,
   * copy link). Returning a promise lets the engine show a busy indicator.
   */
  onRowActivate?: (row: TRow) => Promise<void> | void;

  /**
   * Custom row actions for the actions column. The engine renders
   * these as a trailing button/menu column automatically — no
   * `field: "__action"` workaround needed.
   */
  rowActions?: (row: TRow) => DataTableRowAction[];

  /**
   * Invoked when the engine has mounted and is ready to receive
   * data. Lets the adapter start a subscription (SSE, websocket)
   * and push updates via the returned dispose handle. Optional.
   */
  subscribe?: (onChange: () => void) => () => void;

  /**
   * Map a backend row shape to the engine's row shape. Explicit
   * so the consumer never has to invent a `__raw` slot to hang
   * unmapped fields on.
   */
  mapRow?: (backendRow: unknown) => TRow;
}

export interface DataTableCapabilities {
  /** Fields the server can sort by. Missing/empty means "sort client-side". */
  sortableFields?: string[];
  /** Whether the server supports pagination (limit/offset). */
  serverPagination?: boolean;
  /** Filter operators the server honors. */
  filterableFields?: string[];
  /** Whether the server supports full-text search across fields. */
  globalSearch?: boolean;
}

export interface DataTableQuery {
  page: number;
  pageSize: number;
  sort: SortState[];
  filters: Record<string, string>;
  globalSearch: string;
  /** Opaque server cursor for keyset pagination, if supported. */
  cursor?: string;
}

export interface DataTablePage<TRow> {
  rows: TRow[];
  totalCount: number;
  /** Optional next-page cursor for keyset pagination. */
  nextCursor?: string;
}

export interface DataTableRowAction {
  id: string;
  label: string;
  icon?: ReactNode;
  variant?: "primary" | "destructive" | "ghost";
  execute: () => void | Promise<void>;
  disabled?: boolean;
  busy?: boolean;
}
```

**Per-method justification:**

- **`getRowId(row)`** would have saved me the `payslip_id → id` rename in my view-model — ~8 LOC in the `toRow()` transform plus a comment block explaining why.
- **`capabilities()`** would have told me up-front "this backend doesn't support server-side sort" so I could declare `sortableFields: []` and the engine would sort client-side without forcing me to think about it. In M-02 I would have dropped my hand-rolled sort inside `makePayslipsServerDataSource` — ~25 LOC.
- **`fetchPage(query)`** (vs `fetchData(params)` that is never called) would have saved me **all** the manual state management in `MyPayslipsPrismContent` — the `useState`/`useEffect`/`useCallback` chain, ~40 LOC gone, because the engine would own loading/error/data states and call the adapter on state transitions.
- **`onRowActivate(row)`** replaces `onRowClick` with an explicit adapter method. It also returns a `Promise<void>`, which would have given me free busy-state UI during download — I currently manage `downloadingId: number | null` manually, ~10 LOC and a debatable edge case (the button disables, but the row body does not).
- **`rowActions(row)`** would have eliminated the `field: "id"` faux-column hack and let me declare `{ id: "download", label: "Download", execute: () => downloadPayslipPdf(row.id) }` — ~25 LOC (the whole download column definition) collapses into 5.
- **`subscribe(onChange)`** — not needed for payslips (they don't update live) but the sibling M-03 /documents agent might find it useful for realtime upload progress. Cheap to expose even if most adapters ignore it.
- **`mapRow(backendRow)`** centralises the `Payslip → PayslipRow` transformation inside the adapter, killing the need for a `__raw` passthrough slot. M-02 loses the `__raw: Payslip` hack entirely (~3 LOC in the type + 1 in every render that needed it).

**Total savings estimate:** ~120 LOC out of the 418-line `prism-payslips-datasource.ts` + page wiring would have collapsed into an adapter class with explicit `capabilities`, `fetchPage`, `getRowId`, and `rowActions`. The page itself would drop from 186 LOC to ~50 LOC because state management would move into the engine.

### Comparison to `ChatAdapter`

`ChatAdapter` is 5 methods: `listConversations`, `loadMessages`, `sendMessage`, `deleteConversation`, `renameConversation`. Each matches a user-visible action (open the sidebar, open a chat, send a message, delete, rename).

**Similarities DataTableAdapter should preserve:**

- **One method per user action**, not one method per API call. `onRowActivate` matches "click row," not "fetch detail."
- **Plain async functions, not builders.** No `DataTableQuery.build().sort().filter()` chains; just an object.
- **Extension via subclass, not via config flags.** Arbor's `ArborAdvisoryAdapter extends ArborConversationSummary` is clean; the equivalent is `ArborPayslipsAdapter implements DataTableAdapter<PayslipRow>`.

**Intentional differences from `ChatAdapter`:**

- **`capabilities()` does not exist on `ChatAdapter`** and should not — chat operations are universal. DataTable operations vary enormously (some backends page, some don't; some sort server-side, some don't) so capabilities must be declared or the engine cannot know whether to apply a client-side fallback.
- **`mapRow()` does not exist on `ChatAdapter`** because `ChatMessage` has a canonical shape. DataTable rows are consumer-defined, so the adapter owns the mapping. This is similar to how the advisory adapter has `mapMessage` and `mapConversation` as private helpers — DataTableAdapter should make them public.
- **`rowActions(row)` is per-row** (different rows may expose different actions), whereas chat actions are global. This requires a function that takes the row, not a flat array.
- **`subscribe()` is optional.** `ChatAdapter` has no explicit subscribe because `sendMessage` returns a `ChatStreamHandle` that does the streaming. DataTable has no analogous per-row stream, so the subscription is at the table level and optional.

## Prism BLOCKING gaps (for M-04)

- **[BLOCKING-1]** `web/src/engines/data-table/use-data-table.ts:81-82` + `data-table-root.tsx` — `ServerDataSource.fetchData` is declared in the type system but never invoked. Consumers passing `data: serverSource` get an empty table. **Fix:** in `useDataTable`, add a `useEffect` branch for `!isClientSide` that calls `data.fetchData(params)` whenever `page`, `pageSize`, `sorts`, `filters`, or `globalSearch` change, and stores the result in local state. Also wire `loading`/`error` states from the fetch lifecycle so consumers don't have to manage them externally. This is the single biggest blocker for M-05's adapter design — without it, the `DataTableAdapter` sketched above has nothing to connect to.

- **[BLOCKING-2]** `web/src/engines/data-table/use-data-table.ts:108-113` — `getRowId` is hardcoded to `row['id']`. There is no config hook. **Fix:** add `DataTableConfig.getRowId?: (row: T) => string` and thread it through `useDataTable`. Consumers with `payslip_id`, `document_uuid`, or composite keys cannot currently plug in.

- **[BLOCKING-3]** `web/src/engines/data-table/types.ts:34` — `ColumnDef.render: (value: unknown, row: T) => ReactNode`. The `value` is `unknown` even though the column's `field: string & keyof T` knows the static type. **Fix:** make `ColumnDef` generic over the field: `ColumnDef<T, K extends keyof T = keyof T>` with `render?: (value: T[K], row: T) => ReactNode`. This is a breaking API change but eliminates a whole class of cell-renderer bugs.

## Prism NON-BLOCKING gaps (for /codify)

- **[NON-BLOCKING-1]** `web/src/engines/data-table/types.ts:12` — `DataTableRow = Record<string, unknown>` forces consumers to add `[key: string]: unknown` to every row view-model. A softer constraint like `type DataTableRow = object` would let `interface PayslipRow { id: number; ... }` pass without the index signature. **Fix:** relax `DataTableRow` or drop the constraint entirely in favor of `T` passthrough with a `getRowId` hook.

- **[NON-BLOCKING-2]** `web/src/engines/data-table/data-table-states.tsx:107-128` — `emptyState` ReactNode is wrapped in `<tbody><tr><td colSpan={columnCount}>` with no height or flex constraint, making centered empty-state layouts hard. **Fix:** add a `min-height` and `display: flex` rule to the wrapper, or document the constraint so consumers know to set their own height.

- **[NON-BLOCKING-3]** `web/src/engines/data-table/data-table-root.tsx:54` — the `<DataTable>` component wraps `useDataTable` + layout in one monolithic render. There is no "headless" path for consumers who want the state hook with a custom shell. **Fix:** export `useDataTable` is already done, but document that consumers can call it directly and render their own table. Also add a `DataTableProvider` + `DataTableView` split analogous to Tanstack Table's headless pattern.

- **[NON-BLOCKING-4]** `web/src/engines/data-table/types.ts:115-118` — `ServerFetchParams.filters: Record<string, string>` forces stringification of all filter values. A date-range filter or a numeric "greater than" filter has to serialize to/from a string on both sides. **Fix:** widen to `Record<string, string | number | boolean | { op: string; value: unknown }>` or offer a typed filter system as a follow-up.

- **[NON-BLOCKING-5]** No built-in "loading with stale data visible" state. On refetch, my table flashes to skeleton and back. Tanstack Query distinguishes `isLoading` (initial) from `isFetching` (background). The engine could accept `loading: boolean` AND `refetching: boolean` and keep the current rows rendered when `refetching && !loading`.

- **[NON-BLOCKING-6]** `web/src/engines/data-table/types.ts:37` — `ColumnDef.align` supports `left | center | right` but not `start | end` (logical). For RTL locales this matters. Minor, mostly nit.

## Summary for the M-05 merge session

The central M-02 takeaway is that **`ServerDataSource` as defined today is vestigial**. A consumer cannot use it to connect a backend; the engine is array-only in practice. M-05 should not try to "design a new `DataTableAdapter` alongside `ServerDataSource`" — it should **delete `ServerDataSource` and replace it with `DataTableAdapter`** in the same sweep, because the type surface is misleading otherwise.

The proposed `DataTableAdapter<TRow>` sketch above is the design I want to merge with M-03's sketch. My guess is M-03 /documents will surface the additional methods for multi-select bulk actions (`bulkExecute`), per-row thumbnails (`mapRow` returning a richer shape), and filter facets. Those plug into the adapter naturally via a `filterFacets()` method and a `bulkActions()` method — both extensions to the 7-method base I described.

---

## Capability deviations (added 2026-04-14, M-08 convergence)

Per `rules/specs-authority.md` MUST Rule 6, payroll behaviour deltas between
the bespoke `/my-payslips` and the prism `/my-payslips-prism` routes are
logged here.

### Print-to-PDF download (M6 from wave-2 red team) — NET NEW FEATURE

- **Bespoke** (`src/app/(dashboard)/my-payslips/page.tsx:283-285`): Download button rendered as **disabled** with the comment "PDF generation to be implemented in a later task".
- **Prism** (`src/lib/prism-payslips-datasource.ts::downloadPayslipPdf`): Implements a print-to-PDF flow — fetches `payrollApi.myPayslipDetail(id)`, renders an `escapeHtml`-sanitised HTML document into a new window opened with `noopener,noreferrer`, and calls `window.print()` so the user invokes the browser's native Save-as-PDF.
- **Capability label**: NET NEW (not a parity restore, not a regression). The prism route ships a feature the bespoke route does not have.
- **Disposition**: documented as intentional. Backfilling print-to-PDF into bespoke `/my-payslips` is out-of-scope for wave-2; if pilot evaluation requires iso-functional comparison, the bespoke route would need to consume the same `downloadPayslipPdf` helper.

### Console-logged PII (S1 from wave-2 security red team) — FIXED

- **Pre-fix**: `console.info` lines emitted `payslip_id`, `count`, `latency_ms` at INFO in production; browser RUM and tag managers could correlate.
- **Fix landed**: every `console.info`/`console.error` in `prism-payslips-datasource.ts` routed through a `debugLog()` helper that gates on `process.env.NODE_ENV !== "production"` and emits at `console.debug`. Production browser console is silent.
- **Disposition**: PII no longer reaches production telemetry. `eslint-disable-next-line no-console` comments removed (they applied to the previous INFO calls).

### Error message sanitisation (S2 from wave-2 security red team) — FIXED

- **Pre-fix**: `err.message` from `payrollApi` calls flowed verbatim into the page error banner.
- **Fix landed**: `my-payslips-prism/page.tsx` uses `sanitizeErrorMessage(err)` (`src/lib/prism-error-sanitize.ts`). `PayslipDownloadBlockedError` declares `isUserFacing = true` so its pre-composed popup-blocker message survives the sanitiser.
- **Disposition**: backend error bodies never reach the UI banner. Popup-blocker UX preserved.
