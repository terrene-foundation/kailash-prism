# DataTableAdapter — Interface (§5.1.1)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.1.1 DataTableAdapter<T> (since 0.2.2)

**Status**: SHIPPED in 0.2.2. Seven methods of the nine originally proposed — `filterDimensions` and `subscribe` are reserved for 0.4.0 when the engine-side faceted-filter UI and live-update pipeline land (per `rules/orphan-detection.md` Rule 1, interface methods without wired consumers are not shipped).

**Shipped surface**:
- Required: `getRowId`, `capabilities`, `fetchPage`.
- Optional: `onRowActivate`, `rowActions`, `bulkActions`, `invalidate`.
- `ServerDataSource<T>` is kept as a deprecated public type, internally shimmed to `DataTableAdapter` via `adaptLegacy()`. Removed in 0.3.0.

### Overview

`DataTableAdapter<T, TId>` is a transport-agnostic bridge between a DataTable engine instance and a backend data source. It is to DataTable what `ChatAdapter` (§ 5.6) is to AI Chat: a small, plain-async interface that owns paging/filtering/sorting/row-actions and lets the engine treat any backend (REST, GraphQL, in-memory, fixture, SSE-pushed) uniformly.

The adapter REPLACES `ServerDataSource<T>` (`web/src/engines/data-table/types.ts:109-124`) — the existing interface is an orphan (declared but never invoked, see "Motivation" below) and supersedes the `T[] | ServerDataSource<T>` union on `DataTableConfig.data`.

A consumer constructs an adapter once and passes it to `DataTable` via `data={adapter}` (or `adapter={adapter}` — naming finalized at implementation; see Open Questions). The engine then drives every fetch, filter change, sort change, page change, row activation, row action, bulk action, and (if subscribed) live update through the adapter's typed methods.

### Motivation

Two parallel arbor migrations independently surfaced the same root finding and proposed near-identical adapter shapes:

- M-02 `/my-payslips` (`workspaces/fe-codegen-platform/04-validate/migration-m02-findings.md:81-104, 135-269`) — a simple read-only list of payslip rows. Surfaced: `ServerDataSource.fetchData` is declared but never called (line 92), `getRowId` hardcodes `row['id']` (line 274), action columns require `field: "id"` faux-column hack (line 121), `__raw: Payslip` hack to carry unmapped fields (line 60).
- M-03 `/documents` (`workspaces/fe-codegen-platform/04-validate/migration-m03-findings.md:120-127, 178-292, 446-510`) — a grid/list-toggle page with faceted filter. Surfaced the same orphan (lines 122-127), same action-column workaround (lines 169-174), plus a need for declarative filter dimensions with async option loaders (lines 277-291) and bulk actions tied to selection.

Both migrations together produced **~1,140 LOC** of page+datasource code where ~30-50 LOC of adapter + ~50 LOC of page shell would have sufficed. The adapter's purpose is to collapse that ratio for every future list-shaped page in the Prism ecosystem.

The orphan fix itself is M-04's job (`useDataTable` MUST call the data source on state change); this sub-section defines WHAT the adapter looks like, M-04 wires `ServerDataSource` (the old shape) and M-06 migrates to `DataTableAdapter` (the new shape) — see "Relationship to ServerDataSource" below.

### Interface

```typescript
import type { ReactNode } from 'react';

/**
 * Transport-agnostic adapter for DataTable backends.
 *
 * Consumers implement this interface to connect Prism's DataTable engine to
 * their specific data source (REST, GraphQL, in-memory array, file system,
 * etc). The engine drives every state change through the adapter's methods
 * and renders the result.
 *
 * Lifecycle:
 *   1. Engine mounts, calls capabilities() once.
 *   2. Engine calls fetchPage(initialQuery) and renders rows.
 *   3. On user interaction (sort, filter, page, search), engine recomputes
 *      query and calls fetchPage(query) again. Operations declared in
 *      capabilities() are sent in the query; operations NOT declared are
 *      performed client-side over the most recent fetchPage result.
 *   4. On row click (or keyboard activation), engine calls onRowActivate(row)
 *      if defined.
 *   5. Per-row action buttons are rendered from rowActions(row).
 *   6. Bulk action bar is rendered from bulkActions when selection > 0.
 *   7. Faceted filter UI is generated from filterDimensions if present.
 *   8. If subscribe() is provided, engine invokes it once and refetches
 *      whenever the adapter signals a change. Engine disposes via the
 *      returned cleanup on unmount.
 *   9. After mutations (rowAction onExecute, bulkAction onExecute), engine
 *      calls invalidate() if defined to bust adapter caches and refetch.
 */
export interface DataTableAdapter<T, TId = string> {
  // --- Identity ---

  /**
   * Stable identity for a row. Required.
   *
   * Replaces the hardcoded `row['id']` lookup in useDataTable
   * (web/src/engines/data-table/use-data-table.ts:108-113). The adapter
   * owns identity so consumers with `payslip_id`, `document_uuid`, or
   * composite keys can plug in without renaming fields in a view-model
   * transform.
   *
   * Returned ids MUST be:
   *   - stable across paginations (selection survives page change)
   *   - unique across the entire result set (not just the current page)
   *   - serialisable to string by the engine (`String(id)`) for DOM keys,
   *     aria attributes, and selection-set membership
   */
  getRowId(row: T): TId;

  // --- Capability declaration ---

  /**
   * Declare which query operations the backend supports natively. Required.
   *
   * Operations declared here are sent in the next fetchPage(query) call.
   * Operations NOT declared are performed client-side by the engine over
   * the most-recent fetchPage result. Returning an empty capabilities
   * object is valid and means "I am a fixture/file backend; do everything
   * client-side after a single fetchPage()".
   *
   * Capabilities are read ONCE at mount; an adapter that needs to change
   * its capabilities at runtime MUST be replaced with a new instance.
   */
  capabilities(): DataTableCapabilities;

  // --- Data fetch ---

  /**
   * Fetch one page of rows.
   *
   * `query` carries every dimension of the engine's current state. The
   * adapter destructures what its `capabilities()` declared and ignores
   * the rest. Engine guarantees that `query.sort` is non-empty only if
   * `capabilities().sortableFields` is non-empty; same for filters,
   * search, and pagination.
   *
   * Adapter MUST return total count whenever it knows it. For cursor-
   * paginated backends that cannot cheaply count, return `totalCount: -1`
   * and the engine renders "Load more" instead of a numbered pager (see
   * Pagination Strategy below).
   *
   * fetchPage MAY throw or reject. Engine surfaces the error through its
   * standard error state (see § 5.1 errorState); adapter MUST NOT catch
   * its own errors and return empty pages.
   *
   * Long-running fetches SHOULD honor `query.signal` (AbortSignal) so the
   * engine can cancel in-flight requests on rapid state changes.
   */
  fetchPage(query: DataTableQuery): Promise<DataTablePage<T>>;

  // --- Row interactions ---

  /**
   * Row activation handler. Optional.
   *
   * Invoked on click, double-click (configurable), or Enter on a focused
   * row. The adapter decides what activation means (open detail, download,
   * navigate). Returning a Promise lets the engine display a per-row
   * busy indicator until the promise settles.
   *
   * If both `onRowActivate` and `rowActions` are defined and a row action
   * is clicked, the row action handler runs and `onRowActivate` does NOT
   * (the engine internally calls `event.stopPropagation()` on action
   * buttons). Consumers no longer need to write `e.stopPropagation()` by
   * hand (M-02 friction).
   */
  onRowActivate?: (row: T) => Promise<void> | void;

  /**
   * Per-row action buttons. Optional.
   *
   * Static array with predicate-based per-row visibility/enablement.
   * Engine renders these as a trailing actions column (table mode) or
   * card footer slot (card-grid mode, when CardGrid is wired). Engine
   * owns keyboard nav across the action group, aria grouping, and the
   * disabled-state announcement.
   *
   * Static-with-predicates was chosen over per-row `(row) => Action[]`
   * (see Design Decision 3) so the engine can build menu structure once
   * and the renderer is purely a per-cell predicate evaluation. This
   * also gives a stable focus order across rows.
   */
  rowActions?: ReadonlyArray<DataTableRowAction<T, TId>>;

  /**
   * Multi-row bulk actions. Optional.
   *
   * Engine renders a bulk-action toolbar when `selection.enabled` is true
   * and at least one row is selected. The toolbar's enablement honors
   * each action's `minSelection` / `maxSelection`. Migrating from
   * `DataTableConfig.bulkActions` is non-breaking — the existing prop
   * remains as an escape hatch for adapter-less callers (see Migration
   * Path), but adapter-driven `bulkActions` takes precedence.
   */
  bulkActions?: ReadonlyArray<DataTableBulkAction<T, TId>>;

  // --- Filter dimensions ---

  /**
   * Faceted filter dimensions the adapter understands. Optional.
   *
   * Drives the engine-rendered FilterBar (or replaces the consumer-written
   * one). Each dimension declares its option source, which can be a static
   * list OR an async loader so categories/tags/etc. can be derived from
   * real data instead of hardcoded.
   *
   * Selected dimension values flow back through `query.dimensions` (a
   * `Record<string, string>` keyed by dimension id), separate from
   * `query.filters` (per-column filter inputs from the table header) and
   * `query.globalSearch` (free-text search). The three are NOT merged so
   * an adapter can route them to different backend params (e.g. dimensions
   * → Algolia facets, filters → SQL WHERE, search → full-text).
   */
  filterDimensions?: ReadonlyArray<FilterDimension>;

  // --- Live updates ---

  /**
   * Subscribe to backend changes. Optional.
   *
   * Engine calls subscribe(onChange) once after mount. Adapter opens its
   * SSE/WebSocket/polling channel and invokes onChange() whenever the
   * underlying data may have changed. Engine refetches by calling
   * fetchPage with the current query.
   *
   * The signal is intentionally COARSE ("something changed, refetch") not
   * fine-grained (`onRowUpdated` / `onRowInserted` / `onRowDeleted`). See
   * Design Decision 7 for rationale. Adapters that want to push richer
   * deltas can patch their internal cache and signal coarsely; the engine
   * does not see the deltas.
   *
   * Returned function is the dispose handle. Engine calls it on unmount.
   */
  subscribe?: (onChange: () => void) => () => void;

  // --- Cache invalidation ---

  /**
   * Invalidate adapter caches. Optional.
   *
   * Engine calls invalidate() after a successful rowAction or bulkAction
   * onExecute, before the follow-up fetchPage(). Adapter clears its
   * memoized pages, in-flight request dedup table, etc. Returning a
   * Promise lets the engine wait for the invalidation to complete before
   * refetching.
   *
   * If the adapter has no internal cache, leaving invalidate undefined is
   * correct — engine simply refetches.
   */
  invalidate?: () => Promise<void> | void;
}

// --- Capabilities ---

export interface DataTableCapabilities {
  /** Fields the server can sort by. Empty/missing → engine sorts client-side. */
  readonly sortableFields?: ReadonlyArray<string>;
  /** Whether the server honors limit/offset (or page/pageSize) pagination. */
  readonly serverPagination?: boolean;
  /** Pagination model the server speaks. Default: "offset". */
  readonly paginationMode?: 'offset' | 'cursor';
  /** Per-column filterable fields. Empty/missing → engine filters client-side. */
  readonly filterableFields?: ReadonlyArray<string>;
  /** Whether the server supports a free-text search across fields. */
  readonly globalSearch?: boolean;
  /** Whether the server supports the dimensions declared in filterDimensions. */
  readonly serverDimensions?: boolean;
}

// --- Query / page ---

export interface DataTableQuery {
  readonly page: number;                                   // 0-indexed
  readonly pageSize: number;
  readonly sort: ReadonlyArray<DataTableSort>;
  readonly filters: Readonly<Record<string, string>>;      // per-column header filters
  readonly globalSearch: string;
  readonly dimensions: Readonly<Record<string, string>>;   // faceted filter values
  /** Opaque cursor for keyset pagination. Present iff capabilities.paginationMode === "cursor". */
  readonly cursor?: string;
  /** AbortSignal for cancellation when the engine supersedes a request. */
  readonly signal?: AbortSignal;
}

export interface DataTableSort {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

export interface DataTablePage<T> {
  readonly rows: ReadonlyArray<T>;
  /**
   * Total row count across all pages. Use `-1` to indicate "unknown" for
   * cursor-paginated backends that cannot cheaply count; engine renders
   * "Load more" instead of a numbered pager.
   */
  readonly totalCount: number;
  /** Next-page cursor for keyset pagination. Required iff paginationMode === "cursor" and more pages exist. */
  readonly nextCursor?: string;
}

// --- Row actions ---

export interface DataTableRowAction<T, TId> {
  /** Stable id — used for aria, keyboard focus order, and analytics. */
  readonly id: string;
  /** Display label. Required even for icon-only buttons (used as aria-label). */
  readonly label: string;
  /** Optional leading icon. */
  readonly icon?: ReactNode;
  /** Visual variant. Default: "ghost". */
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  /**
   * Navigation target. Renders as an anchor; the engine wires accessible
   * link semantics. Mutually exclusive with onExecute.
   */
  readonly href?: (row: T, id: TId) => string;
  /**
   * Imperative handler. Renders as a button. Returning a Promise puts
   * the button into a busy state until it settles; engine calls
   * adapter.invalidate() and refetches on success.
   */
  readonly onExecute?: (row: T, id: TId) => void | Promise<void>;
  /** Hide on rows where the predicate returns false. */
  readonly visible?: (row: T) => boolean;
  /** Disable on rows where the predicate returns true. */
  readonly disabled?: (row: T) => boolean;
}

// --- Bulk actions ---

export interface DataTableBulkAction<T, TId> {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  readonly onExecute: (rows: ReadonlyArray<T>, ids: ReadonlyArray<TId>) => void | Promise<void>;
  /** Disable when fewer rows are selected. Default: 1. */
  readonly minSelection?: number;
  /** Disable when more rows are selected. Default: Infinity. */
  readonly maxSelection?: number;
}

// --- Filter dimensions ---

export interface FilterDimension {
  /** Unique id; appears as the key in `query.dimensions`. */
  readonly id: string;
  /** Display label. */
  readonly label: string;
  /** "All" sentinel label; when selected, the dimension is omitted from query.dimensions. Default: "All". */
  readonly allLabel?: string;
  /**
   * Option source. Static array OR async loader. The engine memoises the
   * loader result for the lifetime of the adapter instance; call
   * adapter.invalidate() to refresh.
   */
  readonly options: ReadonlyArray<FilterDimensionOption> | (() => Promise<ReadonlyArray<FilterDimensionOption>>);
  /** UI hint. Engine picks a default based on N: chips ≤ 7, select 8–30, search > 30. */
  readonly ui?: 'chips' | 'select' | 'search';
  /** Whether multiple values can be selected simultaneously. Default: false. */
  readonly multi?: boolean;
}

export interface FilterDimensionOption {
  /** Value placed in `query.dimensions[dimensionId]`. */
  readonly value: string;
  /** Display label. Defaults to `value`. */
  readonly label?: string;
  /** Optional count badge. */
  readonly count?: number;
}
```

