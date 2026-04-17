# 05 Engine Specifications

Spec version: 0.1.0 | Status: DRAFT | Governs: DataTable, Form, Navigation, Layout, Theme, AI Chat engine contracts

---

## Engine Contract Format

Each engine is a self-contained composable unit that encapsulates complex UI behavior. Engines differ from organisms in that they manage their own state, handle their own data fetching lifecycle, and expose composition points for customization. An engine is selected and configured; an organism is assembled from parts.

Every engine section below follows this contract:

1. **Purpose**: one sentence.
2. **Props/Configuration**: complete typed interface.
3. **Internal state**: what state the engine manages.
4. **Events/Callbacks**: what events the engine emits.
5. **Composition points**: where custom content slots in.
6. **Performance contract**: rendering budget, virtual scroll thresholds, lazy loading.
7. **Accessibility contract**: keyboard navigation, ARIA roles, screen reader behavior.
8. **Responsive contract**: how the engine adapts per breakpoint.
9. **Web implementation notes**: React-specific details.
10. **Flutter implementation notes**: Flutter-specific details.

---

## 5.1 DataTable Engine

**Purpose**: Renders tabular data with sorting, filtering, pagination, selection, bulk actions, and virtual scrolling — fully configured from a column schema and data source.

### Props/Configuration

```typescript
interface DataTableConfig {
  // Column definitions
  columns: ColumnDef[];

  // Data source
  data: DataSource;

  // Sorting
  sorting?: {
    enabled: boolean;           // Default: true
    mode: "single" | "multi";   // Default: "single"
    strategy: "client" | "server"; // Default: "client"
    defaultSort?: { field: string; direction: "asc" | "desc" };
  };

  // Filtering
  filtering?: {
    enabled: boolean;           // Default: true
    globalSearch: boolean;      // Default: true
    debounceMs: number;         // Default: 300
    strategy: "client" | "server"; // Default: "client"
  };

  // Pagination
  pagination?: {
    enabled: boolean;           // Default: true
    mode: "pages" | "infinite"; // Default: "pages"
    pageSizeOptions: number[];  // Default: [10, 25, 50, 100]
    defaultPageSize: number;    // Default: 25
  };

  // Selection
  selection?: {
    enabled: boolean;           // Default: false
    mode: "single" | "multi";   // Default: "multi"
    showSelectAll: boolean;     // Default: true (only when mode: "multi")
  };

  // Bulk actions (shown when rows are selected)
  bulkActions?: BulkAction[];

  // Row behavior
  onRowClick?: "navigate" | "select" | "expand" | "none"; // Default: "none"
  expandable?: boolean;         // Default: false
  expandContent?: (row: Row) => Component; // Render function for expanded row

  // Visual
  striped?: boolean;            // Default: false
  bordered?: boolean;           // Default: false
  compact?: boolean;            // Default: false (reduces row height from 52px to 40px)
  stickyHeader?: boolean;       // Default: true
  stickyColumns?: number;       // Default: 0 (number of left columns pinned during horizontal scroll)

  // Column management
  resizableColumns?: boolean;   // Default: false
  reorderableColumns?: boolean; // Default: false
  columnVisibility?: boolean;   // Default: false (toggle column visibility menu)

  // Empty/loading/error
  emptyState?: Component;       // Custom empty state. Default: EmptyState organism.
  loadingState?: Component;     // Custom loading state. Default: Skeleton rows.
  errorState?: Component;       // Custom error state. Default: AlertBanner.

  // Row identity (since 0.2.0)
  getRowId?: (row: Row, index: number) => string; // Stable id extractor. Fallback: row['id'] then index.
}

// Since 0.2.0: DataTableRow relaxed from `Record<string, unknown>` to
// `object` so typed interfaces without an `[key: string]: unknown` index
// signature are accepted directly.

interface ColumnDef<T extends object> {
  field: string & keyof T;      // Data field key (typed).
  header: string;               // Display header text.
  width?: number | "auto";      // Column width in px. "auto" fills remaining space.
  minWidth?: number;            // Minimum width in px. Default: 80.
  maxWidth?: number;            // Maximum width in px.
  sortable?: boolean;           // Default: true when sorting.enabled is true.
  filterable?: boolean;         // Default: true when filtering.enabled is true.
  filterType?: "text" | "select" | "date" | "dateRange" | "number" | "numberRange" | "boolean";
  filterOptions?: string[];     // For "select" filterType: list of options.
  render?: (value: T[keyof T] | undefined, row: T) => Component; // Custom cell renderer. Since 0.2.0: `value` is typed as the field's value, not `unknown`.
  align?: "left" | "center" | "right"; // Default: "left".
  pinned?: "left" | "right" | null;    // Pin column to left or right edge.
  hidden?: boolean;             // Default: false. Initially hidden (user can toggle).
  priority?: number;            // Default: 0. Controls responsive column hiding. Lower number = higher priority (shown on smaller viewports). Columns with priority >= the viewport threshold are hidden. Tablet threshold: 3. Mobile: all columns collapse to card view regardless of priority.
}

interface BulkAction {
  label: string;
  icon?: string;
  variant: "primary" | "destructive" | "ghost";
  onExecute: (selectedRows: Row[]) => void;
  confirmMessage?: string;      // If set, shows confirmation dialog before executing.
}

type DataSource<T> =
  | T[]                          // Static array — engine sorts/filters/paginates client-side
  | ServerDataSource<T>;         // Since 0.2.0: wired end-to-end; `fetchData` is invoked on every state transition

interface ServerDataSource<T> {
  // Called by useDataTable on mount and whenever page/sort/filter/search changes.
  // Returns one page plus the total count for pagination UI. AbortSignal is
  // supplied on `params.signal` so adapters forwarding to fetch() can honour
  // cancellation; stale responses are discarded by the engine regardless.
  fetchData(params: ServerFetchParams): Promise<{ items: T[]; totalCount: number }>;
}

interface ServerFetchParams {
  page: number;
  pageSize: number;
  sort: SortState[];
  filters: Record<string, string>;
  globalSearch: string;
  signal?: AbortSignal; // Since 0.2.0
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `rows` | `Row[]` | Currently visible rows (post-filter, post-sort, post-page). |
| `totalCount` | `number` | Total row count (pre-pagination). |
| `currentPage` | `number` | Current page number (1-indexed). |
| `pageSize` | `number` | Current page size. |
| `sortState` | `SortState[]` | Active sort columns with directions. |
| `filterState` | `Record<string, FilterValue>` | Active filter values keyed by field. |
| `globalSearchQuery` | `string` | Current global search string. |
| `selectedRowIds` | `Set<string>` | Currently selected row identifiers. |
| `expandedRowIds` | `Set<string>` | Currently expanded row identifiers. |
| `loadingState` | `"idle" \| "loading" \| "error" \| "empty"` | Data fetch state. |
| `columnWidths` | `Record<string, number>` | Current column widths (when resizable). |
| `columnOrder` | `string[]` | Current column order (when reorderable). |
| `visibleColumns` | `Set<string>` | Currently visible column fields. |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onSort` | `{ field: string; direction: "asc" \| "desc" }[]` | User clicks a sortable column header. |
| `onFilter` | `Record<string, FilterValue>` | User changes any filter. Debounced by `filtering.debounceMs`. |
| `onGlobalSearch` | `string` | User types in global search. Debounced by `filtering.debounceMs`. |
| `onPageChange` | `{ page: number; pageSize: number }` | User navigates to a different page or changes page size. |
| `onSelectionChange` | `Row[]` | Selection changes (row click, select all, deselect). |
| `onRowClick` | `Row` | User clicks a row body (not action buttons). |
| `onRowExpand` | `{ row: Row; expanded: boolean }` | User toggles row expansion. |
| `onColumnResize` | `{ field: string; width: number }` | User finishes dragging a column resize handle. |
| `onColumnReorder` | `string[]` | User finishes dragging a column to a new position. |
| `onBulkAction` | `{ action: string; rows: Row[] }` | User executes a bulk action (after confirmation if configured). |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `headerActions` | Actions rendered in the table header bar (above the table, right-aligned). | None. |
| `cellRenderer[field]` | Custom renderer for a specific column's cells. | Text display of field value. |
| `expandedRowContent` | Content rendered below an expanded row. | None (expandable must be true). |
| `emptyState` | Replaces the default empty state. | `EmptyState` organism with "No data" message. |
| `loadingState` | Replaces the default loading skeleton. | 5 skeleton rows matching column layout. |
| `errorState` | Replaces the default error banner. | `AlertBanner` with error message and retry button. |
| `bulkActionBar` | Replaces the default bulk action toolbar shown when rows are selected. | Row of `BulkAction` buttons with selection count. |
| `footerContent` | Additional content in the table footer alongside pagination. | None. |

### Performance Contract

- **Virtual scrolling**: MUST activate when row count > 100. Renders only visible rows plus `overscan` buffer (default 5 rows above and below viewport).
- **Row render budget**: Each visible row with default cell renderers MUST render in < 5ms (measured as React commit time or Flutter build time). Custom `cellRenderer` functions that exceed this budget are the consumer's responsibility, but the engine logs a warning when a cell render exceeds 10ms.
- **Sort/filter latency**: Client-side sort or filter on up to 10,000 rows MUST complete in < 100ms. Beyond 10,000 rows, the engine MUST use server-side strategy.
- **Selection**: Select All on 100,000 rows MUST complete in < 50ms (operates on IDs, not row data).
- **Initial render**: Table with 25 visible rows MUST render in < 50ms (excluding data fetch).
- **Horizontal scroll**: Pinned columns MUST remain visible during horizontal scroll without repaint jank.

### Accessibility Contract

- **Role**: `role="table"` (web), semantics table (Flutter).
- **Column headers**: `role="columnheader"` with `aria-sort="ascending|descending|none"` on sortable columns.
- **Keyboard navigation**: Arrow keys move between cells. Enter activates the current cell's action (sort header, select row, expand row). Tab moves to next interactive element within a cell.
- **Sort announcement**: Screen reader announces "Sorted by {column}, {direction}" when sort changes.
- **Selection**: Checkbox column uses standard checkbox semantics. Select All uses `aria-checked="mixed"` (indeterminate) when partial selection.
- **Filter**: Filter inputs have `aria-label` describing the column they filter. Global search has `aria-label="Search all columns"`.
- **Pagination**: Page navigation uses `nav` landmark with `aria-label="Pagination"`. Current page announced as "Page {n} of {total}".
- **Loading**: Table region has `aria-busy="true"` during data fetch. Screen reader announces "Loading data" and "Data loaded, {n} rows" on completion.
- **Empty**: Empty state has `role="status"` with descriptive message.

### Responsive Contract

| Breakpoint | Behavior |
|------------|----------|
| `wide` (1440px+) | Full table with all visible columns. Horizontal scroll if columns exceed container width. |
| `desktop` (1024-1439px) | Full table. Low-priority columns (configured via `hidden` at this breakpoint) may be hidden. |
| `tablet` (768-1023px) | Table with reduced columns. Columns with `priority >= 3` hidden (lower number = higher priority = shown). Horizontal scroll enabled. |
| `mobile` (0-767px) | **Card list view**. Each row renders as a card showing: primary field as card title, secondary field as subtitle, up to 3 additional fields as label:value pairs, status field as badge, actions as icon buttons. The card layout is derived from column definitions: the first column becomes the title, the second becomes the subtitle, columns marked `pinned: "left"` appear as key fields. |

The mobile card layout schema:
```typescript
interface MobileCardLayout {
  title: string;      // field name of first column
  subtitle: string;   // field name of second column
  fields: string[];   // up to 3 additional field names (3rd through 5th columns)
  status?: string;    // field name rendered as Badge (first column with filterType: "select")
  actions?: string[]; // action buttons from bulkActions
}
```

### Web Implementation Notes

- Built on `@tanstack/table` for headless table state management.
- Virtual scrolling via `@tanstack/virtual`.
- Data fetching via React Query (`useQuery` for reads, `useMutation` for bulk actions).
- Sorting/filtering state synced to URL search params for deep linking.
- Column resize via pointer events on resize handles; minimum drag distance: 4px.
- Column reorder via HTML drag-and-drop API with drop indicators.

### Flutter Implementation Notes

- Data displayed via custom `SliverList.builder` (not Flutter's built-in `DataTable` which does not virtualize).
- Virtual scrolling is automatic via `SliverList.builder` with `itemExtent` when row heights are uniform.
- Sort/filter state managed via Riverpod `StateNotifier`.
- Mobile card view uses `Card` widget with `ListTile`-derived layout.
- Column resize via `GestureDetector` on divider widgets.
- Horizontal scroll via nested `SingleChildScrollView(scrollDirection: Axis.horizontal)` wrapping the table body, while the header scrolls in sync via `ScrollController` linking.

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

### Method Justifications

Each method's inclusion is justified by a concrete LOC saving from the M-02 or M-03 migration, plus the failure mode it prevents.

| Method               | Required? | M-02 evidence                           | M-03 evidence                          | LOC saved (est) | Failure mode prevented                                                                 |
| -------------------- | --------- | --------------------------------------- | -------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `getRowId`           | Required  | M-02 §"Renamed `payslip_id → id`" (L58) | M-03 §"No `id` field type safety" (L165) | ~8 LOC          | View-model rename hack; selection unstable across pages.                               |
| `capabilities`       | Required  | M-02 §sketch §"capabilities" (L160-211) | (M-03 only fetches once, still benefits)| ~25 LOC         | Engine cannot decide client/server fallback; consumer hand-rolls sort inside fetcher.   |
| `fetchPage`          | Required  | M-02 §sketch (L165-170, L246)           | M-03 §sketch (L201)                    | ~40 LOC         | Page state managed in consumer (`useState`/`useEffect`/`useCallback`) instead of engine.|
| `onRowActivate`      | Optional  | M-02 §"Row-click vs action-button" (L116-124) | (not surfaced)                  | ~10 LOC         | `e.stopPropagation()` boilerplate; busy-state managed manually.                        |
| `rowActions`         | Optional  | M-02 §"download column" (L121, L247)    | M-03 §"No DataTable action column" (L169) | ~25 LOC      | `field: "id"` faux-column; ad-hoc Link+Button styling; broken keyboard group nav.       |
| `bulkActions`        | Optional  | (not surfaced)                          | M-03 §sketch (L218)                    | ~10 LOC         | Bulk shape lives on engine config, not adapter — diverges from rowActions shape.        |
| `filterDimensions`   | Optional  | (not surfaced)                          | M-03 §sketch (L226), §faceted filter (L290-320) | ~80 LOC | Hardcoded category list; consumers re-implement chip-row + select UI per page.          |
| `subscribe`          | Optional  | M-02 §sketch (L189-192)                 | (not surfaced; useful for live uploads)| ~0 LOC today    | No graceful path for SSE/WebSocket-driven refresh.                                      |
| `invalidate`         | Optional  | (M-02's "refresh after download" implicit) | M-03 §sketch (L228)                | ~5 LOC          | Consumers manually re-trigger fetch after mutation.                                     |

`mapRow` (proposed by M-02) was DROPPED — see Design Decision 6. Its LOC contribution is absorbed by the relaxed `DataTableRow` constraint that M-04's BLOCKING-3 fix introduces.

### Comparison to ChatAdapter

`ChatAdapter` (`web/src/engines/ai-chat/types.ts:128-144`) has 5 methods: `listConversations`, `loadMessages`, `sendMessage`, `deleteConversation`, `renameConversation`. `DataTableAdapter` has 9 (3 required + 6 optional).

**Similarities preserved:**

- **Plain async methods, not builders.** No `query.build().sort().filter()` chains; the adapter takes a single shape (`DataTableQuery`).
- **One method per user concern.** `onRowActivate` matches "click row"; `rowActions` matches "buttons in the row"; `bulkActions` matches "bar above the table when N selected".
- **Extension via implementation, not config flags.** Consumers extend `DataTableAdapter` the way `ArborAdvisoryAdapter implements ChatAdapter` does. No subclassing required, no decorators, no global registry.
- **Transport-agnostic.** REST, GraphQL, SSE, WebSocket, in-memory fixture, FileSystem — every transport implements the same interface.

**Intentional differences:**

- **`capabilities()` exists on DataTableAdapter, not on ChatAdapter.** Chat operations are universal (every chat API can list conversations, load messages, send a message); table operations vary enormously (some backends sort server-side, some don't; some paginate by offset, some by cursor, some return everything in one call). Without `capabilities()` the engine cannot know whether to apply a client-side fallback after the adapter returns rows. This is the single biggest design difference.
- **`rowActions` / `bulkActions` are arrays of declarative actions, not methods.** Chat operations are imperative ("delete this conversation"); table actions are templates that the engine renders into UI. The shape declares aria, keyboard order, and visibility once instead of forcing the engine to introspect a method's return type.
- **`subscribe` is COARSE refetch, not per-message stream.** Chat has `ChatStreamHandle` for token-by-token streaming because that's the user's actual mental model. Table rows are not streamed token-by-token; the right granularity for "this row changed" is "refetch the page."
- **`filterDimensions` has no chat analogue.** Chat doesn't faceted-filter messages; tables routinely do.
- **Cursor pagination is a first-class capability.** Chat conversations are typically loaded in one `loadMessages(conversationId)` call, then appended via streaming. Tables routinely page through 10K-row datasets and need both offset and cursor strategies. The capability flag + `nextCursor` field cover both without two interfaces.

### Relationship to ServerDataSource

**Decision: REPLACE, with a one-release deprecation window.**

`ServerDataSource<T>` (`web/src/engines/data-table/types.ts:109-124`) is an orphan API as documented in M-02 §"BLOCKING-1" (L271-272) and M-03 §"BLOCKING-1" (L446-473). It is declared on `DataTableConfig.data`'s union but `useDataTable` never calls `fetchData`. The type surface is misleading and consumers who pass a `ServerDataSource` get a silently empty table.

Both M-02 (L294: "Delete `ServerDataSource` and replace it with `DataTableAdapter` in one sweep — the type surface is misleading otherwise") and M-03 (L568-571: "without it the entire type-level ServerDataSource contract is vapor") agreed. This spec adopts that recommendation with a controlled migration path:

**Migration plan** (executed by M-04 + M-06, defended below):

1. **M-04 (engine wiring fix):** Wire `ServerDataSource.fetchData` into `useDataTable` so the existing API works for the first time. This unblocks any consumer who already wrote a `ServerDataSource` while M-05/M-06 design and ship `DataTableAdapter`. The wiring is small (~50 LOC) and lives behind the existing union type, so no consumer code changes.

2. **M-06 (adapter introduction, same release):** Add `DataTableAdapter<T>` as a SECOND accepted shape on `DataTableConfig.data`:

   ```typescript
   data: T[] | ServerDataSource<T> | DataTableAdapter<T>
   ```

   Engine internally adapts `ServerDataSource` → `DataTableAdapter` via a thin shim (`function adaptLegacy<T>(src: ServerDataSource<T>): DataTableAdapter<T>`). All new code paths inside the engine consume the adapter shape; the union is purely a public-API compatibility layer.

3. **M-06 release notes + `@deprecated` JSDoc on `ServerDataSource`:** The interface is marked deprecated in the same release as the adapter ships. JSDoc points to the adapter as the replacement and links to a migration cheatsheet.

4. **Next minor release after M-06 (e.g. 0.2.0):** `ServerDataSource` is REMOVED from the public surface. The internal shim is also removed. `DataTableConfig.data: T[] | DataTableAdapter<T>`. This is a breaking change but Prism is pre-1.0 (`web/package.json` is 0.x); minor releases may break public API per semver-pre-1.0 conventions.

This satisfies `rules/orphan-detection.md` MUST Rule 3 ("Removed = Deleted, Not Deprecated") with a one-release window for the deprecation tag — defensible because (a) Prism is pre-1.0, (b) the deprecation comes paired with the actual fix, not a vapor warning, (c) the orphan was never functional so no real consumer can be "depending on the broken behavior" the way M-04's wiring fix would make it appear to (a fresh M-04 consumer might write code against `ServerDataSource` between M-04 ship and M-06 ship; the shim ensures their code keeps working through 0.x).

`ServerFetchParams` and `ServerFetchResult` follow the same lifecycle: deprecated in M-06 (mapped to `DataTableQuery` / `DataTablePage<T>`), removed in 0.2.0.

### Design Decisions

The 8 questions raised by the M-05 brief, answered with rationale tied to the migration findings.

#### DD-1: One adapter or composition (mixins)?

**Decision: ONE interface with optional methods.**

Considered: split `DataTableAdapter` (required core) from `FilterableAdapter`, `SubscribableAdapter`, `BulkActionableAdapter` mixins so a minimal adapter implements only `getRowId + capabilities + fetchPage`. Rejected for three reasons:

1. **Discoverability.** A single interface in IDE autocomplete shows every capability. With mixins the consumer must know to look up `FilterableAdapter` separately.
2. **TypeScript intersection ergonomics.** `DataTableAdapter<T> & FilterableMixin<T> & SubscribableMixin<T>` is uglier than optional methods on one interface and requires every consumer to spell out the intersection.
3. **All optional methods are independent.** Mixins are useful when methods cluster (e.g. CRUD = create+read+update+delete travel together). Here `bulkActions`, `filterDimensions`, `subscribe`, `invalidate` are independent — declaring one does not imply the others. Optional fields express that more honestly than mixins.

The `?` on optional methods is the entire enforcement layer; consumers pay nothing for capabilities they don't use, and `ChatAdapter` proves the pattern works at this scale (5 methods, all required; we have 3 required + 6 optional, similar density).

#### DD-2: Capabilities vs auto-detection

**Decision: EXPLICIT `capabilities()` declaration.**

The alternative — engine always sends the full `DataTableQuery` and the adapter handles client/server split internally — was rejected because:

1. **Fallback is the engine's job.** When the server can't sort, the engine has the rows in hand and can sort them. Pushing that responsibility into the adapter duplicates sort logic across every adapter implementation.
2. **Engine cannot know it failed silently.** If the adapter ignores `query.sort` because the backend doesn't support it, the engine renders unsorted rows but the column header still shows the sort indicator. A user who sees "Name ↓" on rows that aren't actually sorted by name has no way to discover the bug. Capabilities make the contract auditable: the engine asks "do you sort?", the adapter says no, the engine sorts client-side and the indicator means what it says.
3. **M-02 named this as the #1 saving.** L160-211 — explicit capabilities would have eliminated the hand-rolled sort inside `makePayslipsServerDataSource`.

`capabilities()` is read once at mount. An adapter whose capabilities change at runtime (rare) is replaced with a new instance.

#### DD-3: `rowActions` as array vs function

**Decision: STATIC ARRAY with predicate-based per-row visibility/enablement** (M-03's shape).

M-02 proposed `rowActions?: (row: T) => DataTableRowAction[]` (a function that returns a fresh array per row). M-03 proposed `rowActions?: ReadonlyArray<DataTableRowAction>` with `visible?(row)` and `disabled?(row)` predicates inside each action.

The static array wins because:

1. **Stable focus order.** With a function returning a fresh array per row, focus traversal between rows can land on different actions in different positions ("Download" is first on row 1 but "Share" is first on row 2 because the function returned them in different orders). Predicate-based hiding keeps the action *order* stable; only visibility flips.
2. **Engine can pre-build menu structure.** Static actions let the engine compute the actions column width once instead of measuring per-row.
3. **Aria grouping is honest.** Screen readers announce "actions group with 3 buttons; 1 disabled" once for the column. With per-row arrays the announcement varies by row, which is harder for users to predict.
4. **The escape hatch is still available.** A consumer who genuinely needs row-specific actions (e.g. "Approve" only on rows in 'pending' state, "Reject" only on rows in 'pending' state, "Re-open" only on 'closed' rows) writes both actions and uses `visible: (row) => row.status === 'pending'` predicates. The static array handles this.

#### DD-4: `filterDimensions` complexity — adapter or sibling `FilterAdapter`?

**Decision: ON THE SAME `DataTableAdapter` as an optional field.**

A separate `FilterAdapter` was considered to keep `DataTableAdapter` slim. Rejected because:

1. **Filter values flow through `query.dimensions` into `fetchPage`.** Splitting filter dimensions onto a sibling adapter would force the consumer to either (a) hold a reference to the FilterAdapter inside the DataTableAdapter to consult its declared dimensions, or (b) duplicate the dimension declarations in two places. Both are worse than one method on one adapter.
2. **The async option loader is the only "complexity."** Once you accept that filterDimensions is just `Array<{ id, label, options }>` with options optionally being a function — a shape no more complex than `bulkActions` — there is no architectural reason to split it.
3. **M-03's analysis (L226-291) treats it as an adapter concern.** The migration that hit this friction wanted it on the same interface; respecting that is appropriate.

The implementation MAY split internal state management (`useFilterDimensions(adapter)` hook separate from `useDataTable(config)` hook) for code organisation, but the EXTERNAL interface stays unified.

#### DD-5: Deprecation plan for `ServerDataSource`

**Decision: ONE-RELEASE DEPRECATION WINDOW.** See "Relationship to ServerDataSource" above for the full plan. Summary:

- M-04 wires the orphan so existing consumers get correct behavior.
- M-06 ships `DataTableAdapter`, accepts both shapes via union, marks `ServerDataSource` `@deprecated`, ships migration cheatsheet.
- Next minor (0.2.0) removes `ServerDataSource` entirely.

A pure same-release delete was considered but rejected: it would force any consumer who wrote against M-04's wired `ServerDataSource` to immediately rewrite. The one-release window is the smallest defensible deprecation given `rules/orphan-detection.md` MUST Rule 3 and the pre-1.0 status.

A `@deprecated`-only path (mark deprecated, never delete) was rejected because `rules/orphan-detection.md` is explicit: "Removed = Deleted, Not Deprecated. Deprecation banners are easy to miss; consumers continue importing the symbol and silently shipping insecure code."

#### DD-6: `DataTableRow` constraint interaction (and the dropped `mapRow`)

**Decision: ADAPTER ENFORCES ID VIA `getRowId(row)`. NO `mapRow`. Rows can have any shape.**

Once M-04 relaxes `DataTableRow = Record<string, unknown>` to `DataTableRow = object` (or removes the constraint entirely — see M-03 BLOCKING-3), the adapter no longer needs to bridge the row shape. The consumer's row type flows through unchanged.

`getRowId(row)` is the SOLE source of identity. There is no convention that row shape must contain a literal `id` field. Rows with composite keys, no PK, or PK named anything (`payslip_id`, `document_uuid`, `slug`, `__synthetic_idx`) all work — `getRowId` returns whatever string identifies the row.

`mapRow` (proposed by M-02 to handle the `Payslip → PayslipRow` transformation) is DROPPED. The transformation belongs in `fetchPage`'s implementation: the adapter fetches `Payslip[]` from the backend, maps to `PayslipRow[]` inside `fetchPage`, and returns. There's no need for a separate `mapRow` method when `fetchPage` already controls what shape comes out.

This means M-02's `__raw: Payslip` hack disappears (the adapter returns the right shape directly), AND the `[key: string]: unknown` index signature on view-models disappears (M-04 BLOCKING-3 fix relaxes the constraint).

#### DD-7: Streaming / live-update semantics

**Decision: COARSE `subscribe(onChange)` only.**

Considered: fine-grained `onRowUpdated(id, row)`, `onRowInserted(row)`, `onRowDeleted(id)` callbacks. Rejected because:

1. **The engine has to refetch anyway.** Even if the adapter pushes a fine-grained delta, the engine cannot trust that the delta hasn't crossed a sort/filter boundary — a row that "updated" might now match a filter it didn't before, or sort to a different page. The only safe response to a delta is "consider the page invalid; refetch." Coarse and fine-grained are equivalent in observable behavior.
2. **Delta protocols are backend-specific.** Fine-grained callbacks would push protocol assumptions into the interface (does inserting at position N mean offset shifts? what if inserting on a different page?). Coarse refetch is protocol-agnostic.
3. **Adapter-side cache patching is fine.** An adapter that DOES receive fine-grained deltas (say, from a CRDT or a Redux-style store) can patch its internal cache and signal coarsely. The engine doesn't see the delta; the adapter benefits from it on the next refetch.
4. **Symmetry with ChatAdapter.** Chat doesn't have fine-grained "this message changed" callbacks either; updates flow through the next loadMessages call.

If a future consumer truly needs fine-grained updates (e.g. an in-grid live editor showing other users' cursors), that's a different engine, not a richer DataTableAdapter.

#### DD-8: Page-size boundaries — offset vs cursor

**Decision: ONE INTERFACE, capability flag distinguishes.**

`capabilities().paginationMode: 'offset' | 'cursor'` declares which model. `DataTableQuery.cursor` is present iff `paginationMode === 'cursor'`. `DataTablePage.nextCursor` is required for cursor mode (when more pages exist), forbidden for offset.

Two separate interfaces (`OffsetAdapter` vs `CursorAdapter`) were considered. Rejected because:

1. **Engine still has to handle both.** Even with split interfaces, `useDataTable` would need to branch on adapter type to render the correct pager (numbered for offset, "Load more" for cursor). The capability flag does the same branching with fewer types.
2. **Backends mix the modes.** Many real APIs offer offset for small datasets and cursor for large ones, sometimes on the same endpoint. A single adapter can declare its current mode and switch (by replacing the adapter instance).
3. **`totalCount: -1` covers the "cursor without a count" case.** Cursor backends often can't cheaply count; the sentinel says "I don't know" without complicating the page shape.

The pager UI behavior is documented in § 5.1 (existing Pagination spec) and updated to read `totalCount === -1` as the trigger for "Load more" rendering.

### Open Questions (deferred to implementation)

These are intentionally unresolved — the M-06 implementer should decide based on the actual code shape:

- **Prop naming on `DataTableConfig`.** Is the union `data: T[] | DataTableAdapter<T>` or do we add `adapter?: DataTableAdapter<T>` as a separate field with `data` reserved for arrays? The latter is clearer at the type level but adds a config field; the former preserves the existing API. M-06 chooses based on TypeScript ergonomics in real consumer call sites.
- **Should `capabilities()` be a property or a method?** A method allows adapters to compute capabilities lazily (e.g. probe the backend on first call); a property is simpler and matches `ChatAdapter`'s lack of equivalent. Default to method for symmetry with `getRowId(row)`; reconsider if no consumer needs lazy capabilities.
- **AbortSignal threading.** `DataTableQuery.signal` is declared but the engine's exact cancellation strategy (debounce window, "discard stale results vs cancel in-flight") is an implementation detail. M-06 should benchmark and pick the strategy that minimises user-visible flicker on rapid filter changes.
- **`rowActions` rendering when there are too many.** The engine MAY render the trailing N actions inside an overflow menu when the visible count exceeds a threshold; the threshold (3? 5?) and the menu component (Menu? Popover?) are implementation choices.
- **Live-update debounce.** When `subscribe`'s `onChange` fires rapidly (a row updating 30 times per second), the engine should batch refetches. The batch window is an implementation detail.

### Expected LOC Savings (rolled up from migration findings)

| Wave | Baseline | Adapter-driven (estimated) | Savings |
| ---- | -------- | -------------------------- | ------- |
| M-02 `/my-payslips` (datasource + page + columns) | 418 + 186 = 604 LOC | ~30 (adapter) + ~50 (page shell) + 92 (columns unchanged) = 172 LOC | ~430 LOC (~71%) |
| M-03 `/documents` (page + datasource + card) | 456 + 80 + 179 = 715 LOC | ~50 (adapter) + ~80 (page shell with view toggle) + 179 (card unchanged, until CardGrid molecule) = 309 LOC | ~410 LOC (~57%) |
| **Combined** | **~1,140 LOC** | **~480 LOC** | **~660 LOC saved (~58%)** |

These are upper bounds: actual savings depend on (a) M-04 BLOCKING fixes landing first, (b) the `Card` + `CardGrid` molecules from M-03 §"New Prism atoms/molecules needed" landing in a parallel wave, (c) the adapter's `filterDimensions` → engine-rendered `FilterBar` molecule landing.

For new pages built directly against the adapter (no migration baseline), the expected per-page ratio is ~80 LOC of consumer code (adapter + page shell + columns) for a list-shaped page that would have taken ~400-600 LOC of bespoke React+useState+useEffect.

---

## 5.2 Form Engine

**Purpose**: Renders forms with validation, multi-step navigation, conditional field visibility, file uploads, and submission handling — fully configured from a field schema.

### Props/Configuration

```typescript
interface FormConfig {
  // Field definitions
  fields: FieldDef[];

  // Multi-step (optional)
  steps?: StepDef[];

  // Validation
  validation?: {
    mode: "onBlur" | "onChange" | "onSubmit"; // Default: "onBlur"
    schema?: ZodSchema | YupSchema;           // Schema-based validation (overrides per-field)
  };

  // Submission — EITHER onSubmit OR adapter must be provided (since 0.2.1).
  // Passing both is a configuration error: adapter wins and a dev-mode warn
  // fires. Passing neither throws an Error at mount.
  onSubmit?: (values: Record<string, any>) => Promise<void>;

  // Domain adapter (since 0.2.1). See § 5.2.2 — FormAdapter. When present,
  // the adapter owns initial-value seeding, optional async cross-field
  // validation, submit orchestration, and optional post-submit result
  // rendering. Forms with a request→response shape (calculators, "generate"
  // endpoints, payroll runs) should use the adapter path.
  adapter?: FormAdapter<TValues, TResult>;
  submitLabel?: string;           // Default: "Submit"
  cancelLabel?: string;           // Default: "Cancel"
  onCancel?: () => void;
  showReset?: boolean;            // Default: false
  resetLabel?: string;            // Default: "Reset"

  // Layout
  layout?: "single-column" | "two-column" | "compact"; // Default: "single-column"
  sectionGap?: SpacingToken;      // Default: spacing.section.gap

  // Behavior
  autosave?: {
    enabled: boolean;             // Default: false
    intervalMs: number;           // Default: 30000 (30 seconds)
    strategy: "debounce" | "interval"; // Default: "debounce"
  };
  confirmDiscard?: boolean;       // Default: true (shows "unsaved changes" dialog on navigate away)
  initialValues?: Record<string, any>;

  // Custom action row (since 0.2.0). When present, replaces the default
  // submit+reset button row. Receives the full form state plus submit() and
  // reset() callbacks so consumers can build sticky mobile footers, external
  // reset buttons, multi-step wizard controls, etc.
  renderActions?: (state: FormActionsState) => Component;

  // Predicate-based submit disable (since 0.2.0). Runs in addition to the
  // built-in "disabled while submitting" rule — if either returns true,
  // the submit button is disabled. Enables "disable until form is valid".
  submitDisabledWhen?: (state: Omit<FormActionsState, "submitDisabled" | "submit" | "reset">) => boolean;

  // Per-element className overrides for branded styling (since 0.2.0).
  // When an override is present, the corresponding inline `--prism-*` style
  // fallback is skipped so consumer CSS (Tailwind, CSS modules, anything)
  // wins without specificity fights.
  classNames?: {
    form?: string;
    section?: string;
    field?: string;
    label?: string;
    input?: string;
    error?: string;
    helpText?: string;
    actions?: string;
    submitButton?: string;
    resetButton?: string;
  };
}

interface FormActionsState {
  status: "idle" | "validating" | "submitting" | "success" | "error";
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  submitError: string | null;
  submitDisabled: boolean;
  submit: () => void;
  reset: () => void;
}

interface FieldDef {
  name: string;                   // Unique field identifier.
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;             // Default: false
  disabled?: boolean;             // Default: false
  readOnly?: boolean;             // Default: false
  defaultValue?: any;

  // Validation (per-field, used when no schema is provided)
  validation?: FieldValidation[];

  // Conditional visibility
  visible?: ConditionExpression;  // When evaluates to false, field is hidden and excluded from submission.

  // Layout
  span?: 1 | 2;                  // Column span in two-column layout. Default: 1.
  section?: string;               // Group name for visual sectioning.

  // Type-specific props
  options?: Option[];             // For "select", "radio", "checkbox-group" types.
  multiSelect?: boolean;          // For "select" type. Default: false.
  accept?: string[];              // For "file" type. MIME types. e.g., ["image/*", "application/pdf"]
  maxFileSize?: number;           // For "file" type. Max size in bytes.
  maxFiles?: number;              // For "file" type. Default: 1.
  min?: number;                   // For "number" type. Minimum value.
  max?: number;                   // For "number" type. Maximum value.
  step?: number;                  // For "number" type. Step increment.
  rows?: number;                  // For "textarea" type. Visible rows. Default: 3.
  maxLength?: number;             // Character limit.

  // Custom renderer (since 0.2.0). When present, replaces the built-in
  // field input while the label / help / error wrapper still renders
  // around it. Use for domain-specific fields (currency input with a $
  // prefix, combobox, inline badge picker, date range picker).
  render?: (ctx: FieldRenderContext) => Component;
}

interface FieldRenderContext<TValue = unknown> {
  value: TValue;
  onChange: (next: TValue) => void;
  onBlur: () => void;
  error: string | undefined;
  touched: boolean;
  disabled: boolean;
  values: Record<string, unknown>; // Full values — use to compute dependent state.
  field: FieldDef;                  // The FieldDef itself.
  inputId: string;                  // Stable DOM id for the input.
  describedBy: string | undefined;  // aria-describedby id list (help + error).
}

type FieldType =
  | "text" | "email" | "password" | "url" | "phone"
  | "number" | "currency"
  | "textarea"
  | "select" | "multi-select"
  | "radio" | "checkbox" | "checkbox-group"
  | "toggle"
  | "date" | "time" | "datetime"
  | "file"
  | "color"
  | "hidden";

interface FieldValidation {
  rule: "required" | "email" | "url" | "min" | "max" | "minLength" | "maxLength"
      | "pattern" | "custom" | "async";
  value?: any;                    // Parameter for the rule (e.g., min: 5, pattern: /regex/).
  message: string;                // Error message shown on failure.
  asyncValidator?: (value: any) => Promise<string | null>; // For "async" rule. Returns error or null.
}

interface ConditionExpression {
  field: string;                  // Field name to observe.
  operator: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan"
          | "in" | "notIn" | "isEmpty" | "isNotEmpty";
  value?: any;                    // Comparison value.
  // Compound conditions:
  and?: ConditionExpression[];
  or?: ConditionExpression[];
}

interface StepDef {
  id: string;
  title: string;
  description?: string;
  fields: string[];               // Field names belonging to this step.
  validation?: "onNext" | "none"; // Default: "onNext" (validate step fields before advancing).
  optional?: boolean;             // Default: false. When true, step can be skipped.
}

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `values` | `Record<string, any>` | Current field values. |
| `errors` | `Record<string, string[]>` | Current validation errors per field. |
| `touched` | `Set<string>` | Fields the user has interacted with. |
| `dirty` | `Set<string>` | Fields whose value differs from `initialValues`. |
| `isDirty` | `boolean` | True if any field is dirty. |
| `isSubmitting` | `boolean` | True during async submission. |
| `submitError` | `string \| null` | Server-side error from last submission. |
| `submitCount` | `number` | Number of submission attempts. |
| `currentStep` | `number` | Current step index (0-indexed). Only for multi-step forms. |
| `stepValidation` | `Record<string, boolean>` | Per-step validation status. True = step passed validation. |
| `fileUploads` | `Record<string, FileUploadState>` | Per-file-field upload progress. |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onChange` | `{ field: string; value: any; values: Record<string, any> }` | Any field value changes. |
| `onBlur` | `{ field: string }` | A field loses focus. |
| `onValidate` | `{ field: string; errors: string[] }` | Validation runs on a field (per validation mode). |
| `onSubmit` | `Record<string, any>` | Form passes all validation and submits. |
| `onSubmitError` | `{ error: string; values: Record<string, any> }` | Submission fails (server error). |
| `onStepChange` | `{ from: number; to: number; direction: "forward" \| "backward" }` | User navigates between steps. |
| `onReset` | `void` | User resets the form to initial values. |
| `onDirtyChange` | `boolean` | Form dirty state changes (clean to dirty or dirty to clean). |
| `onFileUploadProgress` | `{ field: string; progress: number; fileName: string }` | File upload progress update (0-100). |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `fieldRenderer[name]` | Custom renderer for a specific field. | Standard field component based on `type`. |
| `sectionHeader` | Custom section header when fields are grouped by `section`. | Bold label with divider. |
| `stepIndicator` | Custom step indicator for multi-step forms. | `StepIndicator` molecule (horizontal on desktop, vertical on mobile). |
| `submitButton` | Custom submit button area. | Primary Button with `submitLabel`. |
| `formHeader` | Content above the form fields. | None. |
| `formFooter` | Content below the form fields, above the action buttons. | None. |

### Performance Contract

- **Field render**: Each field MUST render in < 2ms.
- **Validation**: Synchronous validation of all fields MUST complete in < 10ms for forms with up to 50 fields.
- **Async validation**: Debounced by 500ms from last keystroke. MUST NOT block form interaction. Loading indicator shown on the field being validated.
- **Conditional visibility**: Re-evaluation of all `visible` conditions MUST complete in < 5ms when any field value changes.
- **File upload**: Progress callback fires at minimum every 500ms or every 10% progress, whichever is more frequent.
- **Autosave**: MUST NOT block user interaction. Runs in background. If autosave fails, retry once after 5 seconds; on second failure, show non-blocking warning.

### Accessibility Contract

- **Form landmark**: `<form>` element (web) with `aria-label` describing the form purpose.
- **Field labels**: Every field MUST have a visible `<label>` associated via `htmlFor`/`for`. Required fields append "(required)" to the label for screen readers.
- **Error association**: Error messages linked via `aria-describedby` on the input. Screen reader announces "{field label}: {error message}" on validation failure.
- **Help text**: Help text linked via `aria-describedby` (separate from error).
- **Keyboard**: Tab moves between fields in document order. Enter on the last field submits the form (unless the field is a textarea). Escape cancels (calls `onCancel`).
- **Multi-step**: Step indicator announces "Step {n} of {total}: {title}". Next/Previous buttons have clear labels. Step validation errors are announced as a group.
- **File upload**: Drop zone announces "Drop files here or press Enter to browse". Upload progress announced as "{fileName}: {progress}% uploaded".
- **Submit state**: Submit button shows loading spinner and is disabled during submission. Screen reader announces "Submitting" and then "Submitted successfully" or "Submission failed: {error}".

### Responsive Contract

| Breakpoint | Behavior |
|------------|----------|
| `wide` (1440px+) | Two-column layout (when `layout: "two-column"`). Fields with `span: 2` take full width. |
| `desktop` (1024-1439px) | Two-column layout. Same as wide. |
| `tablet` (768-1023px) | Single-column layout (forced, regardless of `layout` prop). All fields full width. |
| `mobile` (0-767px) | Single-column layout. Compact field spacing. Multi-step forms show only current step with swipe gesture to navigate (Flutter) or button navigation (web). Step indicator collapses to "{current}/{total}" label. |

### Web Implementation Notes

- Built on `react-hook-form` for form state management.
- Schema validation via `zod` (preferred) or `yup` with `@hookform/resolvers`.
- File upload via `<input type="file">` with drag-and-drop zone using HTML5 Drag API.
- Unsaved changes warning via `beforeunload` event and router navigation guard.
- Autosave via `useEffect` with debounce timer on `values` changes.

### Flutter Implementation Notes

- Built on Flutter's `Form` and `FormField` widgets with Riverpod state management.
- Validation via custom validator functions (no zod/yup equivalent; validation logic is Dart functions).
- File upload via `file_picker` package with platform-specific file selection.
- Multi-step forms use `PageView` with `PageController` for swipe navigation on mobile.
- Unsaved changes warning via `PopScope` with `canPop` parameter (replaces deprecated `WillPopScope`) and custom navigation guard.

---

## 5.2.2 FormAdapter<TValues, TResult> (since 0.2.1)

**Status**: SHIPPED in 0.2.1. First consumer: arbor `/calculators-prism` (planned migration, M-01 findings).

### Overview

`FormAdapter<TValues, TResult>` is a transport-agnostic bridge between a Prism Form engine instance and a domain service. It is to Form what `ChatAdapter` (§ 5.6) is to AI Chat: a small, plain-async interface that owns submit orchestration, optional async cross-field validation, optional initial-value seeding, and optional post-submit result rendering.

The adapter replaces the `{values, result}` state machine every consumer re-implements around `onSubmit` today. Before the adapter, a calculator page needed ~150 LOC of page shell + ~360 LOC of result rendering to wire Form to its backend; with the adapter, the same page is ~60 LOC and the result renderer moves into the adapter class.

### Interface

```typescript
interface FormAdapter<
  TValues extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> {
  /** Optional: seed initial values (e.g. load a draft from backend). */
  initialValues?(): TValues | Promise<TValues>;

  /**
   * Optional async validation beyond per-field FieldValidationRule.
   * Returns a map of fieldName → message for any invalid fields. An empty
   * object (or absent key) means valid. Called on submit BEFORE submit().
   */
  validate?(values: TValues): Promise<Record<string, string>> | Record<string, string>;

  /** Required. Perform the actual submit (API call, local computation). */
  submit(values: TValues): Promise<TResult> | TResult;

  /**
   * Optional: render the result below the form. When defined, Form owns the
   * "submitted" state internally and eliminates the boilerplate every
   * consumer writes today. Return null to suppress (e.g. adapter navigated
   * away on success).
   */
  renderResult?(values: TValues, result: TResult): ReactNode;

  /** Optional: clear adapter caches / state on form reset. */
  onReset?(): void;
}
```

### Lifecycle

1. Form mounts. If `adapter.initialValues` is defined, its return (or resolved Promise) seeds initial state. Any `FormConfig.initialValues` prop is merged on top (explicit config wins per-field).
2. User fills fields. Per-field `FieldValidationRule`s run as today.
3. On submit, Form calls `adapter.validate(values)` (if defined) for async cross-field validation. Returned errors are surfaced inline and submit is cancelled.
4. Form calls `adapter.submit(values)`:
   - **Success**: Form caches `{values, result}` internally, sets status='success', emits the success feedback banner, and — if `adapter.renderResult` is defined — renders the result node below the form inside a `<div role="region" aria-label="Form result">`.
   - **Failure**: `adapter.submit` throws; Form surfaces the error via its standard submit-error banner. Engine sanitizes the error message: strips ASCII control characters (prevents aria-live log-injection) and truncates to 500 characters with a trailing ellipsis. Consumers can still pre-sanitize with a `sanitizeErrorMessage` helper (see `rules/security.md`) for domain-specific redaction, but the engine-side sanitizer guarantees baseline safety.
5. User edits after submit: Form's internal result state is cleared on the first value change so the post-submit UI never drifts out of sync with pending edits. This applies to ALL `SET_VALUE` dispatches, not just user-typed ones — programmatic `setValue` from a custom renderer after a successful submit clears the cache too (see DD-F3).
6. On reset (button click or programmatic `reset()` via `renderActions`), Form calls `adapter.onReset?.()` for the adapter to clear its own caches/state. The cached submission is cleared automatically.
7. **Unmount safety**: if the component unmounts while `adapter.submit` / `adapter.validate` is in flight, the post-await branches bail out before dispatching on the stale reducer or writing to the detached DOM. No React "state update on unmounted component" warnings; no DOM leaks.

### Design Decisions

#### DD-F1: Adapter OR onSubmit — mutually exclusive submission paths

Passing both `onSubmit` and `adapter` is a configuration error. The adapter wins AND a dev-mode `console.warn` fires **at most once per Form instance** (guarded by a `useRef` so inline-adapter parents that re-render N times don't produce N warnings). Rationale: without the warn, the engine silently picks one and the bug surfaces as "my onSubmit isn't being called." The warn makes the precedence visible to the consumer at first render.

Passing neither throws a clear `Error` at mount with the actionable message: `<Form> requires either 'onSubmit' or 'adapter'. Pass 'adapter' for forms with a post-submit result display, or 'onSubmit' for fire-and-forget submissions.` This is a dev-time failure, not a runtime one — consumers catch it on first unit test.

#### DD-F2: `renderResult` lives on the adapter, not on FormConfig

Considered: add `FormConfig.renderResult?(submission) => ReactNode` alongside `onSubmit`. Rejected because the `{values, result}` state and the render function belong to the same domain concern — separating them forces the consumer to thread the result shape across two places. Keeping them on the adapter class is the single-responsibility shape every HR workflow already uses manually.

#### DD-F3: Cached submission clears on edit, not on submit-error

When ANY `SET_VALUE` dispatch happens after `status === 'success'`, the cached result clears immediately — whether the dispatch came from user typing, blur, a custom renderer's programmatic `setValue`, or an imperative call through `useFormContext().setValue`. The reducer does not (and cannot) distinguish the source of a value change.

When the user submits and the adapter throws, the previous cached result stays visible — so the user can see what they had before retrying. Only a NEW successful submit overwrites the cache. The engine does NOT clear the cache at the start of a new submit; the clear happens exclusively inside the success branch and inside the edit-after-success path above.

Consumers that want to re-hydrate form fields from a submitted result (e.g. "apply these computed values back into the inputs as read-only previews") MUST accept that doing so clears the cached result. If the workflow needs both (re-hydrated fields AND a visible result), store the result in the adapter class and re-read it from `renderResult` rather than relying on the cached submission.

#### DD-F4: `adapter.initialValues` errors fall back to defaults, don't block render

If `adapter.initialValues()` rejects, the form still renders using field defaults. An error in backend draft-loading MUST NOT prevent the user from filling the form from scratch. This matches `rules/zero-tolerance.md` Rule 3 (no silent fallbacks) by emitting a dev-mode `console.error('[Form] adapter.initialValues() failed; falling back to field defaults.', message)` so the draft-load failure is visible in the dev console — and leaving the form in a usable state for the user.

`adapter.initialValues()` is resolved EXACTLY ONCE per component instance. A `useRef` guard prevents inline-adapter consumers (`<Form adapter={new MyAdapter()} />` constructing a fresh object on every parent render) from producing an unbounded backend request loop. The effect dependency array includes `adapter`, but the one-shot ref ensures the resolver fires at most once.

#### DD-F5: No generics on FormConfig itself

`FormAdapter<TValues, TResult>` is generic; `FormConfig` is NOT. Rationale: making `FormConfig` generic would force every existing consumer to either add `FormConfig<Record<string, unknown>, unknown>` everywhere or accept inferred types that may not match their domain. Keeping `FormConfig.adapter?: FormAdapter` non-generic at the config boundary preserves source-compat for every call site in the wild; the adapter class itself remains fully typed.

### Method Justifications

| Method            | Required? | Evidence                                              | LOC saved (est)  | Failure mode prevented                                        |
| ----------------- | --------- | ----------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| `submit`          | Required  | Every M-01 calculator has this shape                  | baseline         | Consumer owns submit error handling per-page                  |
| `renderResult`    | Optional  | M-01 finds 360 LOC of result rendering per consumer   | ~300 LOC / page  | Each consumer re-implements `{values, result}` state machine  |
| `initialValues`   | Optional  | Not surfaced in M-01 but needed for "edit draft"      | ~30 LOC          | Consumer loads draft manually, passes to `initialValues` prop |
| `validate`        | Optional  | Needed for "name is taken" async checks               | ~40 LOC          | Consumer threads async errors through onSubmit manually       |
| `onReset`         | Optional  | Needed for clearing cached compute results on reset   | ~10 LOC          | Form reset leaves stale adapter state that breaks next submit |

### Comparison to DataTableAdapter

Both use the same shape: required core (`submit` / `fetchPage+getRowId+capabilities`) + optional extensions. Both are transport-agnostic (consumer implements the interface, engine drives the methods). Both emit state changes through the engine's normal channels (errors flow through the standard banner; results flow through a declarative render slot).

Key differences:
- DataTable's `capabilities()` exists because table operations vary by backend (some sort server-side, some client-side); Form's submit is universal (every form submits), so no capabilities method.
- Form has no `subscribe` analogue — forms are request/response, not stream.
- DataTable has `rowActions` / `bulkActions` as declarative action arrays; Form has no analogue because a form has only ONE submit.

### Migration path from `onSubmit`

Non-breaking addition. Existing `onSubmit`-only forms continue to work with zero source changes. Consumers who want the post-submit render slot migrate by:

1. Extract `handleSubmit` logic into an `adapter.submit(values)` method.
2. Extract the result render JSX into `adapter.renderResult(values, result)`.
3. Remove the page's `useState<{values, result} | null>` and its clear-on-edit effect.
4. Replace `<Form onSubmit={handleSubmit} />` with `<Form adapter={adapter} />`.

For forms WITHOUT a result display (fire-and-forget submissions — contact forms, feedback forms), `onSubmit` remains the correct API. No forced migration.

---

## 5.3 Navigation Engine

**Purpose**: Manages application navigation structure — sidebar, breadcrumbs, routing, responsive collapse — from a declarative route definition.

### Props/Configuration

```typescript
interface NavigationConfig {
  // Route definitions
  routes: RouteNode[];

  // Navigation style
  style: "sidebar" | "top-nav" | "bottom-nav"; // Default: "sidebar"

  // Sidebar-specific
  sidebar?: {
    width: { collapsed: number; expanded: number }; // Default: { collapsed: 60, expanded: 240 }
    wideWidth?: number;                              // Width at "wide" breakpoint. Default: 280.
    defaultCollapsed?: boolean;                       // Default: false
    collapseBreakpoint?: Breakpoint;                  // Below this breakpoint, sidebar collapses. Default: "tablet"
    position?: "left" | "right";                      // Default: "left"
    showCollapseToggle?: boolean;                     // Default: true
    headerContent?: Component;                        // Content above navigation items (logo, org name).
    footerContent?: Component;                        // Content below navigation items (user menu, settings).
  };

  // Breadcrumbs
  breadcrumbs?: {
    enabled: boolean;             // Default: true
    maxItems: number;             // Default: 4 (items shown before collapsing middle items to "...")
    separator?: string;           // Default: "/" rendered as a visual separator.
    homeLabel?: string;           // Default: first route's label.
  };

  // Active state
  activeMatch?: "exact" | "prefix"; // Default: "prefix" (route /contacts matches /contacts/:id).

  // Badges
  badgeRefreshInterval?: number;  // Milliseconds between badge count refreshes. Default: 60000 (1 min).
}

interface RouteNode {
  path: string;                   // URL path segment. e.g., "/dashboard", "/contacts/:id"
  label: string;                  // Display label in navigation.
  icon?: string;                  // Icon identifier.
  template?: string;              // Page template name (from Spec 06).
  position?: "top" | "bottom";   // Position in sidebar. Default: "top". "bottom" for settings, profile.
  children?: RouteNode[];         // Nested routes.
  badge?: {
    type: "count" | "dot";        // Count shows number; dot shows presence indicator.
    source?: string;              // Data source for badge count. e.g., "api:/notifications/count"
  };
  navVisible?: boolean;           // Default: true. When false, route exists but is not shown in nav (e.g., detail pages).
  dividerBefore?: boolean;        // Show a divider above this item. Default: false.
  group?: string;                 // Group label. Items with the same group are visually grouped.
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `currentPath` | `string` | Current URL path. |
| `activeRoute` | `RouteNode` | The route that matches `currentPath`. |
| `breadcrumbs` | `RouteNode[]` | Ancestor chain from root to `activeRoute`. |
| `expandedGroups` | `Set<string>` | Navigation groups that are expanded (for nested items). |
| `sidebarCollapsed` | `boolean` | Whether the sidebar is in collapsed (icon-only) state. |
| `mobileDrawerOpen` | `boolean` | Whether the mobile nav drawer is open. |
| `badgeCounts` | `Record<string, number>` | Current badge counts keyed by route path. |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onNavigate` | `{ from: string; to: string }` | User navigates to a new route. |
| `onSidebarToggle` | `boolean` | Sidebar collapse state changes. |
| `onGroupToggle` | `{ group: string; expanded: boolean }` | A navigation group is expanded or collapsed. |
| `onBreadcrumbClick` | `{ path: string; index: number }` | User clicks a breadcrumb item. |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `sidebarHeader` | Content at the top of the sidebar (logo, org name). | None (configure via `sidebar.headerContent`). |
| `sidebarFooter` | Content at the bottom of the sidebar (user menu). | None (configure via `sidebar.footerContent`). |
| `navItem` | Custom renderer for a navigation item. | Icon + Label + Badge (standard NavItem molecule). |
| `breadcrumbItem` | Custom renderer for a breadcrumb segment. | Link with route label. |
| `mobileHeader` | Content in the mobile app header (between hamburger and actions). | App title or logo. |

### Performance Contract

- **Route matching**: Path matching MUST complete in < 1ms for route trees up to 200 nodes.
- **Sidebar render**: Full sidebar with 50 items MUST render in < 20ms.
- **Badge refresh**: Badge count fetches MUST NOT block navigation rendering. Badges update asynchronously; stale counts display until refresh completes.
- **Navigation transition**: Route change to sidebar active state update MUST complete in < 16ms (single frame).

### Accessibility Contract

- **Landmark**: Sidebar uses `<nav>` with `aria-label="Main navigation"` (web). Flutter uses `Semantics(label: "Main navigation")`.
- **Current page**: Active nav item has `aria-current="page"`.
- **Expandable groups**: Group headers have `aria-expanded="true|false"` and `aria-controls` pointing to the group's item list.
- **Keyboard**: Arrow keys navigate between items. Enter activates item. Home/End jump to first/last item. Escape closes mobile drawer.
- **Breadcrumbs**: `<nav aria-label="Breadcrumb">` with ordered list. Last item (current page) is not a link and has `aria-current="page"`.
- **Sidebar toggle**: Toggle button has `aria-label="Collapse sidebar"` or `"Expand sidebar"` based on state.
- **Mobile**: Hamburger button has `aria-label="Open navigation menu"`. Drawer has `role="dialog"` with focus trap.

### Responsive Contract

| Breakpoint | Sidebar Behavior |
|------------|-----------------|
| `mobile` (0-767px) | Sidebar hidden. Hamburger icon in top header bar. Tapping hamburger opens full-screen slide-over drawer from left. Drawer has close button and backdrop dismiss. |
| `tablet` (768-1023px) | Icon-only rail (60px wide). Hovering or tapping an icon shows tooltip with label. Nested groups show as popover menus. |
| `desktop` (1024-1439px) | Full sidebar (240px). Text labels visible. Nested groups expand inline. Collapse toggle visible. |
| `wide` (1440px+) | Full sidebar (280px). Same behavior as desktop with wider width. |

Breadcrumb responsive behavior:
- `mobile`: Hidden (current page title shown in header instead).
- `tablet+`: Visible. Items beyond `maxItems` collapse to a "..." dropdown in the middle of the chain.

### Web Implementation Notes

- Routing via Next.js App Router (`usePathname`, `useRouter`) or React Router v6 (`useLocation`, `useNavigate`).
- Sidebar state persisted to `localStorage` key `prism:sidebar-collapsed`.
- Badge counts fetched via React Query with configurable `refetchInterval`.
- Mobile drawer uses `Layer` primitive with `tier: "modal"`, `trapFocus: true`.
- Sidebar width transition animated with `transition: width 200ms ease`.

### Flutter Implementation Notes

- Routing via `go_router` package.
- Sidebar implemented as `NavigationRail` (tablet) or `Drawer` (mobile) or custom widget (desktop/wide).
- Sidebar state managed via Riverpod `StateProvider`.
- Badge counts fetched via Riverpod `FutureProvider.autoDispose` with refresh timer.
- Mobile drawer uses Flutter's `Scaffold.drawer` or custom `SlideTransition`.

---

## 5.4 Layout Engine

**Purpose**: Transforms the layout grammar (Spec 04) and page template definitions (Spec 06) into rendered output, orchestrating zone placement, responsive adaptation, and navigation integration.

### Props/Configuration

```typescript
interface LayoutEngineConfig {
  // Template selection
  template: TemplateName;         // One of the 11 defined templates.

  // Zone content mapping
  zones: Record<string, ZoneContent>;

  // Navigation integration
  navigation?: NavigationConfig;  // Navigation engine config. When provided, wraps the template in navigation chrome.

  // Page-level overrides
  pageMargin?: SpacingToken | ResponsiveValue<SpacingToken>; // Override spacing.page.margin.
  maxContentWidth?: number;       // Maximum width of the content area in px. Default: 1440.

  // Theme override
  theme?: string;                 // Theme name override for this page. Default: inherits from ThemeEngine.
}

interface ZoneContent {
  engine?: string;                // Engine name (e.g., "DataTable", "Form", "Chat").
  organism?: string;              // Organism name (e.g., "Toolbar", "FilterPanel").
  component?: Component;          // Direct component reference.
  props: Record<string, any>;     // Props passed to the engine/organism/component.
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `currentBreakpoint` | `Breakpoint` | The active breakpoint based on viewport width. |
| `resolvedTemplate` | `TemplateLayout` | The template's layout tree with responsive values resolved for the current breakpoint. |
| `zoneVisibility` | `Record<string, VisibilityRule>` | Per-zone visibility at the current breakpoint. |
| `zoneOrder` | `string[]` | Zone rendering order at the current breakpoint. |
| `navigationState` | `NavigationState` | Current state of the integrated navigation engine (sidebar collapsed, active route, etc.). |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onBreakpointChange` | `{ from: Breakpoint; to: Breakpoint }` | Viewport crosses a breakpoint boundary. |
| `onZoneReady` | `{ zone: string }` | A zone's content has finished its initial render. |
| `onPageReady` | `void` | All zones have emitted `onZoneReady`. |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `pageHeader` | Content above the template (global header, announcements). | None. |
| `pageFooter` | Content below the template (global footer). | None. |
| `zoneWrapper[name]` | Custom wrapper around a specific zone's content. | Default zone container with spacing tokens applied. |

### Performance Contract

- **Template instantiation**: Resolving a template layout tree and applying responsive values MUST complete in < 5ms.
- **Breakpoint transition**: Re-resolving all responsive values on breakpoint change MUST complete in < 10ms.
- **Zone lazy loading**: Zones marked `responsive.{breakpoint}: "hidden"` at the current breakpoint MUST NOT render their content. Content is mounted only when the zone becomes visible.
- **Page chrome**: Navigation frame (sidebar + header) renders independently of zone content. Navigation MUST be visible within 100ms of page load; zone content may load progressively.

### Accessibility Contract

- **Page landmark**: Main content area uses `<main>` element (web) or equivalent semantics (Flutter).
- **Skip link**: On web, a "Skip to main content" link is rendered as the first focusable element, targeting the main content zone. Visually hidden until focused.
- **Zone landmarks**: Zones MAY specify an ARIA landmark role (navigation, complementary, contentinfo) via the template definition.
- **Focus management**: On route change, focus moves to the main content area (or to a heading within it if one exists).

### Responsive Contract

The Layout Engine is the central coordinator for responsive behavior:

1. It monitors viewport width and resolves the current breakpoint.
2. It propagates the breakpoint to all child layout primitives, zones, and engines.
3. It re-evaluates zone visibility, zone order, and layout primitive collapse rules on every breakpoint change.
4. It coordinates the navigation engine's responsive behavior (sidebar collapse/expand).

The Layout Engine does NOT independently transform; it applies the template's declared responsive rules (from Spec 06).

### Web Implementation Notes

- Implemented as a React context provider (`PrismLayoutProvider`) that supplies breakpoint information to all children.
- Breakpoint detection via `window.matchMedia` listeners (one per breakpoint boundary).
- CSS-based layout (Grid/Flex) for template structure. JavaScript handles zone visibility toggling and order changes.
- Navigation chrome rendered outside the main content `Suspense` boundary so it appears before zone content loads.
- `maxContentWidth` applied as `max-width` on the content container with `margin: 0 auto` for centering.

### Flutter Implementation Notes

- Implemented as a widget tree starting with `Scaffold` (when navigation is present) or raw layout widgets.
- Breakpoint detection via `MediaQuery.of(context).size.width` in the top-level `LayoutBuilder`.
- Zone visibility managed via conditional widget inclusion in the build method (hidden zones return `SizedBox.shrink()`).
- Navigation integration via `Scaffold(drawer: ..., body: ...)` for mobile, custom `Row` layout for tablet/desktop.

---

## 5.5 Theme Engine

**Purpose**: Loads design tokens from `design-system.yaml`, injects them as CSS custom properties (web) or `ThemeData` (Flutter), and manages dark mode switching and brand switching at runtime.

### Props/Configuration

```typescript
interface ThemeEngineConfig {
  // Token source
  tokens: DesignSystemYaml;       // Parsed design-system.yaml (all three tiers).

  // Initial theme
  defaultTheme?: string;          // Theme name. Default: "enterprise" (first available theme).
  defaultMode?: "light" | "dark" | "system"; // Default: "system".

  // Behavior
  persistPreference?: boolean;    // Default: true. Saves theme + mode to storage.
  storageKey?: string;            // Default: "prism:theme".
  transitionDuration?: number;    // Duration of theme switch animation in ms. Default: 200.

  // Per-page overrides
  pageOverrides?: Record<string, Partial<TokenOverrides>>; // Keyed by route path.
}

interface TokenOverrides {
  // Any Tier 2 or Tier 3 token can be overridden per page.
  // Example: a marketing page may use larger heading sizes.
  [tokenPath: string]: string | number;
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `activeTheme` | `string` | Name of the currently active theme (e.g., "enterprise", "modern"). |
| `activeMode` | `"light" \| "dark"` | Resolved color mode (never "system" — always resolved to light or dark). |
| `systemPreference` | `"light" \| "dark"` | OS-level color scheme preference. |
| `resolvedTokens` | `ResolvedTokenMap` | Fully resolved token values for the active theme + mode combination. |
| `cssVariables` | `Record<string, string>` | (Web only) Map of CSS custom property names to values. |
| `themeData` | `ThemeData` | (Flutter only) Generated Flutter ThemeData. |
| `activeOverrides` | `Partial<TokenOverrides>` | Currently applied per-page overrides. |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onThemeChange` | `{ from: string; to: string }` | Active theme changes (brand switch). |
| `onModeChange` | `{ from: "light" \| "dark"; to: "light" \| "dark" }` | Color mode changes. |
| `onSystemPreferenceChange` | `"light" \| "dark"` | OS color scheme preference changes. |
| `onTokensResolved` | `ResolvedTokenMap` | Token resolution completes (initial load or after switch). |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `modeToggle` | Custom mode toggle component. | Toggle switch with sun/moon icons. |
| `themePicker` | Custom theme/brand picker component. | Dropdown with theme names and color swatches. |

### Performance Contract

- **Token resolution**: Resolving all tokens for a theme + mode combination MUST complete in < 5ms. Token count varies by theme complexity (typically 200-500 for the three tiers combined).
- **CSS variable injection** (web): Setting all CSS custom properties on `document.documentElement` MUST complete in < 2ms.
- **ThemeData generation** (Flutter): Generating `ThemeData` from resolved tokens MUST complete in < 10ms.
- **Theme switch**: Full theme switch (resolve + inject + repaint) MUST complete within 200ms. No flash of unstyled content.
- **Initial load**: Theme MUST be resolved and applied before first paint. On web, critical CSS variables are inlined in the HTML `<head>` as a `<style>` block to prevent flash.

### Accessibility Contract

- **Contrast compliance**: The constraint validator MUST verify that all text/background combinations meet WCAG 2.1 AA contrast ratios: 4.5:1 for normal text (< 18px or < 14px bold), 3:1 for large text (>= 18px or >= 14px bold).
- **Mode toggle**: Accessible label: "Switch to dark mode" or "Switch to light mode" based on current state.
- **Reduced motion**: When `prefers-reduced-motion: reduce` is detected, all theme transition animations are replaced with instant switches (duration: 1ms, not 0ms for rendering guarantees).
- **Focus visibility**: Focus rings MUST maintain 3:1 contrast against their background in both light and dark modes. The focus ring token is part of the theme.

### Responsive Contract

The Theme Engine has no breakpoint-specific behavior. Token values are constant across breakpoints. Responsive spacing and layout changes are handled by the Layout Engine (Spec 5.4) and the spacing tokens in Spec 04.

Exception: `spacing.page.margin` and `spacing.section.gap` are responsive tokens. The Theme Engine resolves these per-breakpoint values; the Layout Engine applies them.

### Token Loading Process

1. At build time, the token compiler reads `design-system.yaml` and generates:
   - **Web**: A TypeScript module exporting token maps per theme per mode, plus a CSS file with all custom properties.
   - **Flutter**: A Dart file exporting `ThemeData` factories per theme per mode, plus constant color/spacing/typography classes.

2. At runtime, the Theme Engine:
   - Reads the user's persisted preference (theme + mode) from storage.
   - If no preference, reads OS `prefers-color-scheme`.
   - Resolves the token set for the determined theme + mode.
   - Injects the resolved tokens (CSS variables on web, ThemeData on Flutter).
   - Listens for OS preference changes and user-initiated switches.

### CSS Variable Injection (Web)

Token paths map to CSS custom property names by replacing dots with dashes and prefixing with `--prism-`:

```
color.interactive.primary -> --prism-color-interactive-primary
spacing.component.padding -> --prism-spacing-component-padding
radius.component.default  -> --prism-radius-component-default
```

All component CSS references these variables:
```css
.prism-button-primary {
  background-color: var(--prism-color-interactive-primary);
  padding: 0 var(--prism-spacing-component-padding);
  border-radius: var(--prism-radius-component-default);
}
```

### ThemeData Generation (Flutter)

The token compiler generates a `PrismTheme` class that extends `ThemeData`:

```dart
ThemeData prismTheme({
  required String theme,
  required Brightness brightness,
}) {
  final tokens = resolveTokens(theme, brightness);
  return ThemeData(
    brightness: brightness,
    colorScheme: ColorScheme(
      primary: tokens.color.interactive.primary,
      onPrimary: tokens.color.text.onPrimary,
      surface: tokens.color.surface.page,
      // ... all semantic color tokens mapped
    ),
    textTheme: TextTheme(
      displayLarge: TextStyle(fontSize: tokens.type.heading.h1.size, ...),
      // ... all type tokens mapped
    ),
    // ... spacing, radius, shadow via ThemeExtension
  );
}
```

### Dark Mode Switching

**Exact behavior**:
1. User clicks mode toggle (or system preference changes when mode is "system").
2. Theme Engine resolves the new token set (same theme, different mode).
3. **Web**: CSS transition is applied to `background-color` and `color` on `:root` with duration `transitionDuration`. CSS variables are updated on `document.documentElement.style`. The transition creates a smooth fade.
4. **Flutter**: `AnimatedTheme` widget wraps the app with `duration: transitionDuration`. The new `ThemeData` is set, triggering a smooth rebuild.
5. Preference is saved to storage (if `persistPreference: true`).

**System preference detection**:
- Web: `window.matchMedia('(prefers-color-scheme: dark)')` with `addEventListener('change', ...)`.
- Flutter: `MediaQuery.of(context).platformBrightness`.

### Brand Switching

**Exact behavior**:
1. User selects a new theme from the theme picker.
2. Theme Engine resolves all tokens for the new theme + current mode.
3. **Web**: All CSS variables are updated simultaneously. A `data-theme` attribute is set on `<html>` for any theme-specific CSS selectors.
4. **Flutter**: New `ThemeData` is generated and set, triggering a full rebuild.
5. Preference is saved to storage.

Brand switching changes ALL token values (colors, typography, spacing if different, radius, shadows). It is a complete visual transformation.

### Token Override (Per-Page or Per-Component)

Overrides are scoped via CSS specificity (web) or `Theme` widget nesting (Flutter).

**Web**: A `<div data-prism-overrides>` wrapper with inline CSS custom properties:
```html
<div style="--prism-type-heading-h1-size: 48px; --prism-spacing-page-margin: 48px;">
  <!-- Marketing page with larger headings and margins -->
</div>
```

**Flutter**: A nested `Theme` widget with modified `ThemeData`:
```dart
Theme(
  data: Theme.of(context).copyWith(
    textTheme: Theme.of(context).textTheme.copyWith(
      displayLarge: TextStyle(fontSize: 48),
    ),
  ),
  child: MarketingPage(),
)
```

Overrides cascade: component-level overrides take precedence over page-level overrides, which take precedence over theme defaults.

---

## 5.6 AI Chat Engine

**Purpose**: Renders a complete AI conversation interface with streaming messages, tool call visualization, citations, action plans, and conversation management — purpose-built for Kailash Kaizen agent applications.

### Props/Configuration

```typescript
interface ChatEngineConfig {
  // Connection
  endpoint: string;               // WebSocket or HTTP streaming endpoint.
  protocol: "websocket" | "sse";  // Default: "sse" (Server-Sent Events).

  // Conversation
  conversationId?: string;        // Resume existing conversation. Null for new.
  systemPrompt?: string;          // System prompt (hidden from user, sent with each request).

  // Message types enabled
  features?: {
    citations: boolean;           // Default: true. Show inline citations with source panel.
    toolCalls: boolean;           // Default: true. Show tool call visualization.
    actionPlans: boolean;         // Default: true. Show approve/modify/reject action plans.
    branching: boolean;           // Default: false. Allow conversation branching (edit + re-submit).
    search: boolean;              // Default: true. Search within conversation history.
    pinning: boolean;             // Default: false. Pin important messages.
    attachments: boolean;         // Default: false. Allow file attachments in input.
    suggestions: boolean;         // Default: true. Show suggestion chips.
    templates: boolean;           // Default: false. Show prompt templates.
  };

  // Input configuration
  input?: {
    placeholder?: string;         // Default: "Type a message..."
    maxLength?: number;           // Default: 10000 characters.
    allowedAttachmentTypes?: string[]; // MIME types for attachments.
    maxAttachmentSize?: number;   // Max file size in bytes. Default: 10MB (10485760).
    maxAttachments?: number;      // Default: 5.
    sources?: SourceOption[];     // Data source selector options (e.g., "All docs", "Company wiki").
  };

  // Display
  avatars?: {
    user?: string | Component;    // User avatar (URL or custom component).
    assistant?: string | Component; // Assistant avatar.
  };
  messageGrouping?: {
    enabled: boolean;             // Default: true. Group consecutive same-sender messages.
    maxGapMs: number;             // Default: 60000. Messages more than this apart are separate groups.
  };

  // Conversation list (sidebar)
  conversationList?: {
    enabled: boolean;             // Default: true.
    source: string;               // API endpoint for conversation list.
    groupBy?: "date" | "topic";   // Default: "date" (Today, Yesterday, Last 7 days, Older).
  };
}

interface SourceOption {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}
```

### Message Types

Each message in the conversation has a type that determines its rendering:

| Type | Description | Rendered As |
|------|-------------|-------------|
| `user` | User's input message. | Right-aligned bubble (web) or full-width with user avatar (Flutter). |
| `assistant` | AI response (complete). | Left-aligned with assistant avatar. Supports markdown rendering. |
| `assistant-streaming` | AI response (in progress). | Same as `assistant` but with cursor animation at the end. Tokens append in real-time. |
| `system` | System message (e.g., "Conversation started", "Agent switched"). | Centered, muted text, no avatar. |
| `tool-call` | AI invoked a tool. | Inline collapsible block showing tool name + parameters. |
| `tool-result` | Tool returned a result. | Inline collapsible block showing result summary + full data on expand. |
| `error` | Error message. | AlertBanner variant (`error`) with optional retry button. |
| `citation-reference` | Inline citation marker. | Superscript number that opens citation panel on click. |

**Message schema**:
```typescript
interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;                // Markdown content (for user/assistant). Tool JSON (for tool-call/result).
  timestamp: number;              // Unix ms.
  sender: "user" | "assistant" | "system";

  // Citations (assistant messages only)
  citations?: Citation[];

  // Tool calls (tool-call messages only)
  toolCall?: {
    name: string;
    parameters: Record<string, any>;
    status: "queued" | "running" | "done" | "error";
    duration?: number;            // Execution time in ms.
  };

  // Tool results (tool-result messages only)
  toolResult?: {
    summary: string;              // One-line summary shown inline.
    data: any;                    // Full result data shown on expand.
    success: boolean;
  };

  // Branch metadata
  parentId?: string;              // If this message is a branch, the parent message ID.
  branchIndex?: number;           // Branch number (0 = original, 1+ = branches).

  // Domain-specific metadata
  meta?: Record<string, unknown>; // Extensible metadata (e.g. riskTier, confidenceScore, conversationId).
                                  // Adapters set meta.conversationId on complete events so useChatState
                                  // can track new conversation IDs without a racy refresh.
}

interface Citation {
  index: number;                  // Display number (1-indexed).
  source: string;                 // Source document/URL.
  excerpt: string;                // Relevant excerpt from the source.
  confidence?: number;            // 0-1. Displayed as percentage.
  page?: number;                  // Page number if applicable.
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `messages` | `ChatMessage[]` | All messages in the current conversation. |
| `isStreaming` | `boolean` | True while receiving a streaming response. |
| `streamBuffer` | `string` | Accumulated tokens of the in-progress response. |
| `conversations` | `ConversationSummary[]` | List of user's conversations (for sidebar). |
| `activeConversationId` | `string \| null` | Currently viewed conversation. |
| `inputValue` | `string` | Current input field value. |
| `attachments` | `File[]` | Files attached to the current input. |
| `selectedSource` | `string \| null` | Selected data source filter. |
| `citationPanelOpen` | `boolean` | Whether the citation side panel is visible. |
| `activeCitation` | `Citation \| null` | Currently highlighted citation. |
| `toolCallSteps` | `ToolCallStep[]` | Accumulated tool call steps for StreamOfThought display. |
| `actionPlan` | `ActionPlanStep[] \| null` | Current action plan awaiting user approval. |
| `searchQuery` | `string` | Conversation search query. |
| `searchResults` | `ChatMessage[]` | Messages matching search query. |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onSend` | `{ content: string; attachments: File[]; source?: string }` | User sends a message. |
| `onStreamStart` | `{ conversationId: string }` | Streaming response begins. |
| `onStreamToken` | `string` | Each token received during streaming. |
| `onStreamEnd` | `{ message: ChatMessage }` | Streaming response completes. |
| `onToolCallStart` | `ToolCallStep` | A tool call begins execution. |
| `onToolCallEnd` | `ToolCallStep` | A tool call completes. |
| `onCitationClick` | `Citation` | User clicks a citation marker. |
| `onActionPlanResponse` | `{ stepIndex: number; action: "approve" \| "modify" \| "reject"; modification?: string }` | User responds to an action plan step. |
| `onConversationSwitch` | `{ from: string; to: string }` | User switches to a different conversation. |
| `onConversationCreate` | `string` | New conversation created (returns new ID). |
| `onBranch` | `{ messageId: string; newContent: string }` | User edits a message and re-submits (creating a branch). |
| `onError` | `{ error: string; recoverable: boolean }` | Connection error or server error. |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `messageRenderer[type]` | Custom renderer for a specific message type. | Default renderers per type (see Message Types). |
| `inputArea` | Custom input area replacement. | TextArea + attachment button + source selector + send button. |
| `conversationListItem` | Custom conversation list item. | Title + last message preview + timestamp. |
| `streamOfThought` | Custom StreamOfThought visualization. | Vertical step list with status icons. |
| `actionPlanStep` | Custom action plan step renderer. | Numbered step with description + approve/modify/reject buttons. |
| `citationCard` | Custom citation panel card. | Source title + excerpt + confidence badge + page number. |
| `suggestionChips` | Custom suggestion chip layout. | Horizontal scrollable row of chip buttons. |
| `emptyConversation` | Content shown when conversation has no messages. | Welcome message + suggestion chips. |
| `headerBar` | Content in the chat header (conversation title, actions). | Conversation title + search button + settings button. |
| `renderMessageActions` | Custom action buttons per message (e.g. feedback, escalation, risk badge). | None (no default actions). |

### Transport Adapter

The ChatAdapter interface decouples the chat engine from any specific backend:

```typescript
interface ChatAdapter {
  listConversations(): Promise<ConversationSummary[]>;
  loadMessages(conversationId: string): Promise<ChatMessage[]>;
  sendMessage(conversationId: string | null, content: string, attachments?: File[]): ChatStreamHandle;
  deleteConversation(id: string): Promise<void>;
  renameConversation(id: string, title: string): Promise<void>;
}

interface ChatStreamHandle {
  onToken(callback: (token: string) => void): void;
  onComplete(callback: (message: ChatMessage) => void): void;
  onError(callback: (error: Error) => void): void;
  abort(): void;
}

interface ConversationSummary {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;     // Unix ms.
  messageCount: number;
  meta?: Record<string, unknown>;  // Domain-specific (e.g. riskTier).
}
```

**ID contract**: All IDs are `string`. Backends using numeric IDs (e.g. arbor advisory) convert in their adapter. The `onComplete` message should set `meta.conversationId` when a new conversation is created so the state manager can track it.

### State Management (useChatState / KChatState)

Transport-agnostic state management provided as a React hook (`useChatState`) and Flutter ChangeNotifier (`KChatState`). Manages conversations, messages, streaming buffer, and conversation CRUD. Consumer passes a ChatAdapter; the hook wires everything internally.

### ConversationTemplate Wired Mode

The ConversationTemplate supports two modes:

1. **Wired mode**: Pass `adapter: ChatAdapter` and the template internally composes ConversationSidebar, ChatEngine, and useChatState. Consumers customize via `renderMeta` (domain badges per conversation), `renderMessageActions` (per-message actions like feedback), and `renderContent`/`renderSidebar` overrides.

2. **Manual mode**: Pass `conversationList` and `content` as ReactNode/Widget for full control.

The template auto-wraps with LayoutProvider if not already inside one, so consumers don't need to know about the layout dependency.

### Streaming Contract

**Token-by-token rendering**:
1. Tokens arrive via SSE `data:` events or WebSocket messages.
2. Each token is appended to `streamBuffer` and the message display re-renders.
3. Markdown parsing runs incrementally: complete blocks (paragraphs, code fences, lists) are parsed and rendered; incomplete blocks show as plain text with cursor.
4. Code blocks are syntax-highlighted as they complete (language detection from fence info string).
5. Re-render budget per token: < 5ms. If a burst of tokens arrives (> 10 in < 16ms), they are batched into a single render.
6. Cursor animation: a blinking `|` character at the end of the stream buffer, animated at 530ms on/530ms off.

**Markdown rendering**:
- Headings: h1-h4 with appropriate typography tokens.
- Bold, italic, strikethrough, inline code.
- Code blocks with syntax highlighting (language auto-detection or fence-specified).
- Ordered and unordered lists (nested up to 3 levels).
- Tables (rendered as compact DataTable).
- Links (open in new tab on web, in-app browser on mobile).
- Images (rendered inline with lazy loading).
- Block quotes.
- Horizontal rules.
- LaTeX math expressions (inline `$...$` and block `$$...$$`).

### Tool Call Visualization (StreamOfThought)

Tool calls are displayed as a step list within the assistant's message:

```
  Searching knowledge base...        [done]     (1.2s)
  Analyzing 3 relevant documents     [running]  (...)
  Generating response                [queued]
```

Each step has:
- **Name**: Tool or action description.
- **Status**: `queued` (gray dot), `running` (blue spinner), `done` (green checkmark), `error` (red X).
- **Duration**: Elapsed time shown for `running` (live counter) and `done` (final time).
- **Expandable**: Clicking a step shows its parameters (input) and result (output) in a collapsible panel.

The StreamOfThought block appears inline within the assistant message, between the tool call and the final response text.

### Action Plan

When the assistant proposes a multi-step plan, it is rendered as a numbered list with per-step controls:

```
Plan: Set up user authentication

  1. Create User model with email/password fields     [Approve] [Modify] [Reject]
  2. Add login endpoint with JWT token generation      [Approve] [Modify] [Reject]
  3. Add registration endpoint with email validation   [Approve] [Modify] [Reject]
  4. Add password reset flow with email verification   [Approve] [Modify] [Reject]

  [Approve All]  [Reject All]
```

- **Approve**: Step is accepted. Button changes to green checkmark.
- **Modify**: Opens an inline text editor to modify the step description. On save, the modified step is sent back to the assistant.
- **Reject**: Step is rejected with optional reason input.
- **Approve All / Reject All**: Batch operations on all pending steps.
- Steps already approved/rejected show their status and cannot be changed (unless the assistant re-proposes).

### Citation System

**Inline citations**: Rendered as superscript numbers within the assistant message text. Example: "The revenue grew by 15%[1] compared to last quarter[2]."

**Citation panel**: A collapsible side panel (right side on desktop, bottom sheet on mobile) showing citation details:
- Source title (clickable link to original).
- Relevant excerpt (highlighted text from the source).
- Confidence score (displayed as percentage badge: green >= 80%, yellow >= 50%, red < 50%).
- Page number (if applicable).

**Interaction**:
- Clicking a citation number opens the panel and highlights the corresponding citation card.
- Clicking a citation card in the panel scrolls the message to the inline reference.
- Multiple citations can be highlighted simultaneously.

### Conversation Management

**Thread list** (sidebar):
- Grouped by date: "Today", "Yesterday", "Last 7 days", "Last 30 days", "Older".
- Each item shows: conversation title (auto-generated from first user message or explicit title), last message preview (truncated to 80 characters), timestamp.
- New conversation button at the top.
- Search input above the list (filters by title and message content).
- Swipe to delete on mobile. Right-click context menu on desktop with: Rename, Pin, Delete.

**Branching** (when enabled):
- User can click "Edit" on any of their previous messages.
- The message becomes editable inline.
- On submit, a new branch is created from that point. The original branch is preserved.
- A branch indicator shows "Branch 1", "Branch 2" etc. with a switcher to navigate between branches.

### Input Configuration

**Input area components**:
1. **Text input**: Multi-line textarea with auto-grow (1 line to 6 lines max). Markdown formatting supported.
2. **Attachment button**: Opens file picker. Selected files shown as removable chips below the input.
3. **Source selector**: Dropdown to filter which data sources the assistant searches. Only shown when `input.sources` is configured.
4. **Send button**: Primary icon button (arrow-up icon). Disabled when input is empty and no attachments.

**Keyboard shortcuts**:
- `Enter`: Send message.
- `Shift+Enter`: New line in input.
- `Escape`: Clear input (if not empty) or close citation panel (if open).
- `Ctrl/Cmd+K`: Open conversation search.
- `Ctrl/Cmd+N`: New conversation.
- `Up Arrow` (in empty input): Edit last user message (if branching enabled).

**Suggestion chips**:
- Displayed below the input area when the conversation is empty or after an assistant response.
- Horizontal scrollable row of chip buttons.
- Clicking a chip populates the input and optionally auto-sends.
- Chips are either static (configured in `features.templates`) or dynamic (returned by the assistant in the response metadata).

### Performance Contract

- **Time to first token display**: < 100ms from when the first SSE/WebSocket token arrives.
- **Token append render**: < 5ms per token render cycle. Batch if tokens arrive faster than 16ms.
- **Message list scroll**: 60 fps scroll performance with up to 1000 messages loaded. Messages beyond the viewport are virtualized.
- **Conversation switch**: < 200ms to render a cached conversation. < 500ms for a conversation requiring a network fetch.
- **Search**: < 100ms for client-side search across 1000 messages. Server-side search for larger histories.
- **Citation panel**: Opens in < 100ms (slide animation).
- **Markdown rendering**: Complete message markdown rendering MUST finish within 50ms for messages up to 5000 characters.

### Accessibility Contract

- **Landmark**: Chat area uses `role="log"` with `aria-live="polite"` for new messages. `aria-label="Conversation with AI assistant"`.
- **Messages**: Each message has `role="article"` with `aria-label="{sender} said: {first 100 chars}"`.
- **Streaming**: During streaming, the in-progress message has `aria-busy="true"`. On completion, the final message is announced via `aria-live`.
- **Input**: `aria-label="Message input"`. Character count announced when approaching `maxLength` (at 80% and 95%).
- **Send**: Send button has `aria-label="Send message"`. Disabled state communicated via `aria-disabled`.
- **Citations**: Citation numbers are buttons with `aria-label="Citation {n}: {source title}"`. Citation panel has `role="complementary"` with `aria-label="Citations"`.
- **Tool calls**: StreamOfThought has `role="status"`. Each step announces its status change.
- **Action plan**: Plan has `role="list"`. Each step's buttons have `aria-label="Approve step {n}: {description}"` etc.
- **Conversation list**: `role="navigation"` with `aria-label="Conversations"`. Active conversation has `aria-current="true"`.
- **Keyboard**: All interactive elements reachable via Tab. Escape closes panels and popovers. Focus trapped in mobile drawer when open.

### Responsive Contract

| Breakpoint | Behavior |
|------------|----------|
| `mobile` (0-767px) | Conversation list hidden (accessible via hamburger). Chat takes full width. Citation panel as bottom sheet (half screen). Input fixed to bottom. StreamOfThought collapsed by default (tap to expand). Action plan buttons stack vertically. |
| `tablet` (768-1023px) | Conversation list as collapsible drawer (icon-only rail when collapsed). Chat takes remaining width. Citation panel as slide-over from right (40% width). |
| `desktop` (1024-1439px) | Conversation list visible (260px). Chat fills middle. Citation panel as inline side panel (280px), togglable (hidden by default, shown on citation click). |
| `wide` (1440px+) | Conversation list visible (320px). Chat fills middle. Citation panel as inline side panel (380px). Three-column layout: conversations | chat | citations. |

### Web Implementation Notes

- Streaming via `EventSource` (SSE) or native `WebSocket`.
- Markdown rendering via `react-markdown` with `remark-gfm` and `rehype-highlight` plugins.
- LaTeX via `rehype-katex`.
- Virtual message list via `@tanstack/virtual` with reverse scroll (newest messages at bottom, scroll up for history).
- Citation panel uses `Layer` primitive with `tier: "page"` (inline, not overlay) on desktop; `tier: "modal"` (bottom sheet) on mobile.
- Conversation list state persisted to `localStorage`.

### Flutter Implementation Notes

- Streaming via `dart:io` `WebSocket` or `http` package for SSE parsing.
- Markdown rendering via `flutter_markdown` with custom syntax extensions.
- LaTeX via `flutter_math_fork`.
- Message list via `ListView.builder` with `reverse: true` for bottom-anchored scrolling.
- Citation panel via `DraggableScrollableSheet` on mobile; `Row` layout with constrained width on desktop.
- Conversation list via `NavigationDrawer` on mobile; persistent `Column` on desktop.

---

## 5.7 Error Boundary and Recovery Patterns

### Error Boundary Placement

Error boundaries are placed at the **zone level**. Each zone in a page template is wrapped in an error boundary so that a crash in one zone does not take down the entire page. Adjacent zones continue functioning normally.

**Web**: React `ErrorBoundary` component wraps each zone's content.
**Flutter**: Each zone widget is wrapped in a `Builder` with `FlutterError.onError` handler scoped to the zone.

### Fallback UI

When a zone's content throws an unhandled exception, the error boundary renders a fallback:

| Severity | Fallback UI | Recovery |
|----------|-------------|----------|
| Recoverable (render error) | `AlertBanner(variant: "error")` with message "Something went wrong in this section" + "Retry" button | Retry button re-mounts the zone content |
| Unrecoverable (data corruption) | Same AlertBanner + "Reload page" link | Full page reload |

### Error Reporting

When an error boundary catches an exception:
1. The error, component stack, and zone name are logged to the console (development)
2. In production, the error is sent to the configured error reporting endpoint (if `ThemeEngineConfig.errorReportingEndpoint` is set)
3. The payload includes: error message, component stack trace, zone name, template name, active breakpoint, theme, and timestamp

### Retry Semantics

- Retry re-mounts the zone content from scratch (resets component state, re-fetches data)
- Maximum 3 automatic retries with 1s, 2s, 4s exponential backoff
- After 3 failed retries, the fallback shows "This section is unavailable" with only "Reload page" option
- Data-fetch errors within an engine use React Query's retry mechanism (3 retries, exponential backoff) before surfacing to the error boundary

---

## 5.8 Kailash SDK Integration

### Nexus Integration

The `useNexusQuery` hook (web) / `NexusProvider` (Flutter) bridges Prism engines to Kailash Nexus endpoints.

**Data source resolution**:
- `"api:/contacts"` resolves to `nexus.get("/contacts", { params })`
- `"api:POST /contacts"` resolves to `nexus.post("/contacts", { body })`
- The Nexus base URL is configured at the ThemeEngine/Provider level via `nexusBaseUrl`

**Type generation**: The `@kailash/prism-compiler` generates TypeScript interfaces from Nexus endpoint schemas. These types are consumed by `useNexusQuery<T>` and `useNexusMutation<T>` hooks, providing end-to-end type safety from API schema to rendered component.

**Hooks**:
```typescript
// Read data with caching, deduplication, and background refresh
const { data, isLoading, error } = useNexusQuery<Contact[]>("/contacts", { page, pageSize, filters });

// Mutate data with optimistic updates and error rollback
const { mutate, isPending } = useNexusMutation<Contact>("POST", "/contacts");
```

**Pagination mapping**:
- Engine pagination `{ page, pageSize }` maps to Nexus query params `?page={page}&limit={pageSize}`
- Nexus response `{ data: Row[], meta: { total, page, limit } }` maps to engine state `{ rows, totalCount, currentPage, pageSize }`

**Authentication**:
- Nexus auth token provided via context/provider (not per-request)
- 401 responses trigger `onAuthExpired` callback (configurable: redirect to login or refresh token)

### DataFlow Integration

The `useDataFlow` hook (web) / `DataFlowProvider` (Flutter) enables model-aware CRUD page generation.

**Column inference** (DataTable):
- A DataFlow model definition can auto-generate `ColumnDef[]` for DataTableEngine
- Field types map: `String` -> `filterType: "text"`, `Integer/Float` -> `filterType: "number"`, `Date` -> `filterType: "date"`, `Boolean` -> `filterType: "boolean"`, `Enum` -> `filterType: "select"` with options from enum values

**Form field inference** (Form):
- A DataFlow model definition can auto-generate `FieldDef[]` for FormEngine
- Field types map similarly; `required` inferred from `nullable: false`

**Access control**:
- DataFlow model-level access controls determine which fields appear in column/field definitions
- Fields the current user cannot read are excluded from generated schemas
- Fields the current user cannot write are set to `readOnly: true` in form fields

**Type bridge**: The `@kailash/prism-compiler` reads DataFlow model definitions and generates TypeScript interfaces matching each model's field schema. These interfaces are shared between Nexus endpoint types and DataTable/Form engine configurations.

### Kaizen Integration (AI Chat Engine)

The AI Chat Engine is purpose-built to consume Kailash Kaizen streaming responses.

- The `endpoint` prop in `ChatEngineConfig` points to a Kaizen agent's streaming endpoint
- Kaizen's streaming protocol (SSE with `event: token`, `event: tool_call`, `event: citation`) maps directly to the engine's `MessageType` union
- The `onToolCallStart` / `onToolCallEnd` events correspond to Kaizen's tool execution lifecycle
- The `onActionPlanResponse` callback sends approval/rejection back to the Kaizen agent via the configured Nexus endpoint

---

## 5.9 Offline Behavior Contract

### Detection
- Web: `navigator.onLine` + `online`/`offline` events, with React Query's `onlineManager`
- Flutter: `connectivity_plus` package
- Tauri: Rust-side network monitoring via system events

### Visual Indicator
When offline, a persistent banner appears at the top of the content area (below navigation header):
- AlertBanner variant: `warning`
- Message: "You're offline. Changes will be saved when you reconnect."
- Not dismissable while offline

### Engine Behavior When Offline

| Engine | Read behavior | Write behavior |
|--------|--------------|----------------|
| DataTable | Shows cached data (React Query cache). Shows offline banner. Refresh disabled. | Mutations queued locally via React Query's `MutationCache`. Visual indicator on queued items. |
| Form | Shows current form values. Validation runs locally. | onSubmit queues mutation. Shows "Saved locally" toast. Syncs on reconnect. |
| Navigation | Client-side routing works. Badge counts frozen at last known values. | N/A |
| AI Chat | Shows cached conversation. New messages cannot be sent. | Input disabled with "Offline" indicator. Reconnection attempts every 5s with exponential backoff. |
| Theme | Fully functional (tokens are local). | Preference save queued. |

### Reconnection
On reconnect: queued mutations replay in FIFO order. React Query's `focusManager` triggers background refetches for stale queries. Conflicts (server state changed during offline period) surface via engine `onConflict` callback. User resolves conflicts manually.

### Service Worker Caching (Web)
- Static assets (JS, CSS, fonts): cache-first strategy via service worker
- API responses: network-first with stale-while-revalidate fallback
- Design system tokens: precached on first load
