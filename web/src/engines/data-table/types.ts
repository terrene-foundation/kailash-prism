/**
 * DataTable Engine — Shared types
 * Spec: docs/specs/05-engine-specifications.md § 5.1
 */

import type { ReactNode } from 'react';

// --- Row type ---

/**
 * Generic row type — consumers provide their own shape.
 *
 * The engine only requires rows to be object-shaped. Consumers with typed
 * interfaces (e.g. `interface PayslipRow { id: number; gross: number }`) can
 * pass them directly without adding an `[key: string]: unknown` index
 * signature. The engine coerces row field access internally via a typed
 * assertion at the boundary so consumers retain the strong typing of `T`.
 */
export type DataTableRow = object;

// --- Column definition ---

export interface ColumnDef<T extends DataTableRow> {
  /** Data field key */
  field: string & keyof T;
  /** Display header text */
  header: string;
  /** Column width in px, or "auto" to fill remaining space */
  width?: number | 'auto';
  /** Minimum width in px. Default: 80 */
  minWidth?: number;
  /** Whether this column is sortable. Default: inherits from config.sorting.enabled */
  sortable?: boolean;
  /** Whether this column is filterable. Default: inherits from config.filtering.enabled */
  filterable?: boolean;
  /** Filter input type for this column */
  filterType?: 'text' | 'select' | 'number' | 'boolean';
  /** Options for select filter type */
  filterOptions?: string[];
  /**
   * Custom cell renderer.
   *
   * `value` is typed as `T[keyof T] | undefined` so a renderer receives the
   * statically-typed field value rather than an opaque `unknown`. This
   * eliminates the `Number(value as unknown)` coercion pattern at call sites
   * where the column's `field` already names a specific typed property on T.
   *
   * Breaking change in 0.2.0: callbacks previously typed `(value: unknown, row: T)`
   * remain assignable (a function accepting `unknown` can handle any narrower
   * type) but new callbacks can take advantage of the tighter typing.
   */
  render?: (value: T[keyof T] | undefined, row: T) => ReactNode;
  /** Text alignment. Default: "left" */
  align?: 'left' | 'center' | 'right';
}

// --- Sorting ---

export interface SortingConfig {
  /** Default: true */
  enabled?: boolean;
  /** Default: "single" */
  mode?: 'single' | 'multi';
  /** Default sort to apply on mount */
  defaultSort?: { field: string; direction: 'asc' | 'desc' };
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

// --- Filtering ---

export interface FilteringConfig {
  /** Default: true */
  enabled?: boolean;
  /** Show global search input. Default: true */
  globalSearch?: boolean;
  /** Debounce for filter inputs in ms. Default: 300 */
  debounceMs?: number;
}

// --- Pagination ---

export interface PaginationConfig {
  /** Default: true */
  enabled?: boolean;
  /** Page size options. Default: [10, 25, 50, 100] */
  pageSizeOptions?: number[];
  /** Default page size. Default: 25 */
  defaultPageSize?: number;
}

// --- Selection ---

export interface SelectionConfig {
  /** Default: false */
  enabled?: boolean;
  /** Default: "multi" */
  mode?: 'single' | 'multi';
  /** Show select-all checkbox. Default: true */
  showSelectAll?: boolean;
}

// --- Bulk actions ---

export interface BulkAction<T extends DataTableRow> {
  /** Button label */
  label: string;
  /** Visual variant */
  variant: 'primary' | 'destructive' | 'ghost';
  /** Handler receiving selected rows */
  onExecute: (selectedRows: T[]) => void;
}

// --- Data source ---

/**
 * Two accepted shapes for `DataTableConfig.data` (since 0.3.0):
 *
 * - **Plain array** — engine sorts / filters / paginates client-side.
 * - **`DataTableAdapter<T>`** — the canonical adapter contract.
 *   Owns getRowId, capability declaration, paging / filtering / sorting /
 *   row activation / row actions / bulk actions / cache invalidation.
 *
 * `ServerDataSource<T>` was removed in 0.3.0. Consumers migrating from
 * 0.2.x should use the migration cheatsheet from the 0.2.2 CHANGELOG —
 * the only move is to add `getRowId` and `capabilities` methods alongside
 * a renamed `fetchPage` (was `fetchData`). The shim `adaptLegacy` that
 * existed in 0.2.2 is also removed; if you need a drop-in lift, copy
 * its ~30 LOC from git history (commit 8489bc9) into your code.
 */
export type DataSource<T extends DataTableRow> =
  | T[]
  | DataTableAdapter<T>;

// --- DataTableAdapter (canonical) ---

/**
 * Capabilities an adapter declares to the engine, read once at mount.
 *
 * Operations DECLARED are forwarded to the adapter (via `fetchPage` query
 * fields). Operations NOT DECLARED are performed client-side over the most
 * recent `fetchPage` result. An adapter with every capability empty is a
 * valid "in-memory fixture" — the engine fetches once and then sorts /
 * filters / paginates locally.
 */
export interface DataTableCapabilities {
  /** Fields the server can sort by. Empty/missing → engine sorts client-side. */
  readonly sortableFields?: ReadonlyArray<string>;
  /** Whether the server honors limit/offset (or page/pageSize) pagination. Default: false. */
  readonly serverPagination?: boolean;
  /** Pagination model the server speaks. Default: "offset". */
  readonly paginationMode?: 'offset' | 'cursor';
  /** Per-column filterable fields. Empty/missing → engine filters client-side. */
  readonly filterableFields?: ReadonlyArray<string>;
  /** Whether the server supports a free-text search across fields. Default: false. */
  readonly globalSearch?: boolean;
}

/**
 * Sort order element forwarded to the adapter.
 *
 * Shape mirrors the engine's internal `SortState` and is identical across
 * both the legacy `ServerFetchParams.sort` and the new
 * `DataTableQuery.sort` so migration from the old to the new contract is
 * field-rename-free.
 */
export interface DataTableSort {
  readonly field: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * Single-page query forwarded to `DataTableAdapter.fetchPage`. The engine
 * populates every field even when the adapter does not declare the
 * corresponding capability (adapters that care about performance should
 * destructure only what `capabilities()` declared).
 */
export interface DataTableQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly sort: ReadonlyArray<DataTableSort>;
  /** Per-column header filters. */
  readonly filters: Readonly<Record<string, string>>;
  readonly globalSearch: string;
  /** Opaque cursor for keyset pagination. Present iff paginationMode === "cursor". */
  readonly cursor?: string;
  /** AbortSignal for cancellation when the engine supersedes a request. */
  readonly signal?: AbortSignal;
}

/**
 * Single-page response from the adapter. `totalCount: -1` signals an unknown
 * total (cursor-paginated backends that can't cheaply count); the engine
 * renders "Load more" instead of a numbered pager in that case.
 */
export interface DataTablePage<T extends DataTableRow> {
  readonly rows: ReadonlyArray<T>;
  readonly totalCount: number;
  /** Next-page cursor for keyset pagination. Required iff paginationMode === "cursor" and more pages exist. */
  readonly nextCursor?: string;
}

/**
 * Declarative per-row action. Engine renders the array as a trailing
 * actions column (table mode) or as a card-footer slot (card-grid mode,
 * when CardGrid is wired in Shard 4).
 *
 * `onExecute` and `href` are mutually exclusive — `href` renders an
 * anchor, `onExecute` renders a button. Exactly one MUST be defined.
 */
export interface DataTableRowAction<T extends DataTableRow, TId = string> {
  /** Stable id — used for aria, keyboard focus order, analytics. */
  readonly id: string;
  /** Display label. Required even for icon-only buttons (used as aria-label). */
  readonly label: string;
  /** Optional leading icon. */
  readonly icon?: ReactNode;
  /** Visual variant. Default: "ghost". */
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  /** Navigation target. Renders as anchor. Mutually exclusive with onExecute. */
  readonly href?: (row: T, id: TId) => string;
  /**
   * Imperative handler. Renders as button. Returning a Promise puts the
   * button into a busy state until it settles; engine calls
   * `adapter.invalidate?.()` and refetches on success.
   */
  readonly onExecute?: (row: T, id: TId) => void | Promise<void>;
  /** Hide on rows where the predicate returns false. */
  readonly visible?: (row: T) => boolean;
  /** Disable on rows where the predicate returns true. */
  readonly disabled?: (row: T) => boolean;
}

/**
 * Multi-row bulk action. Rendered in the bulk-action toolbar above the
 * table when `selection.enabled` is true and at least one row is
 * selected. Adapter-driven bulk actions take precedence over
 * `DataTableConfig.bulkActions` when both are declared — the engine
 * merges with adapter first (so consumer configs can extend, not
 * compete).
 */
export interface DataTableBulkAction<T extends DataTableRow, TId = string> {
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

/**
 * Transport-agnostic adapter for DataTable backends.
 *
 * Consumers implement this interface to connect Prism's DataTable engine
 * to any specific data source (REST, GraphQL, in-memory array, file system,
 * etc). The engine drives every state change through the adapter's methods
 * and renders the result.
 *
 * See `docs/specs/05-engine-specifications.md` § 5.1.1 for the full
 * contract including lifecycle, comparison with ChatAdapter, design
 * decisions, and the ServerDataSource migration path.
 *
 * This 0.2.2 iteration ships 3 required + 4 optional methods:
 *
 * - **Required**: `getRowId`, `capabilities`, `fetchPage`.
 * - **Optional**: `onRowActivate`, `rowActions`, `bulkActions`, `invalidate`.
 *
 * `filterDimensions` (faceted filter UI) and `subscribe` (live updates)
 * are reserved for 0.4.0 when the engine-side UI lands — per
 * `rules/orphan-detection.md` Rule 1, interface methods without wired
 * consumers are not shipped.
 */
export interface DataTableAdapter<T extends DataTableRow, TId = string> {
  /**
   * Stable identity for a row. Required.
   *
   * Returned ids MUST be:
   *   - stable across paginations (selection survives page change)
   *   - unique across the entire result set (not just the current page)
   *   - serialisable to string by the engine (`String(id)`) for DOM keys,
   *     aria attributes, and selection-set membership
   */
  getRowId(row: T): TId;

  /**
   * Declare which query operations the backend supports natively. Required.
   *
   * Read ONCE at mount; an adapter that needs to change its capabilities at
   * runtime MUST be replaced with a new instance.
   */
  capabilities(): DataTableCapabilities;

  /**
   * Fetch one page of rows. Required.
   *
   * Long-running fetches SHOULD honor `query.signal` (AbortSignal) so the
   * engine can cancel in-flight requests on rapid state changes. `fetchPage`
   * MAY throw / reject; the engine surfaces errors through `errorState`. An
   * adapter MUST NOT catch its own errors and return empty pages.
   */
  fetchPage(query: DataTableQuery): Promise<DataTablePage<T>>;

  /**
   * Row activation handler. Optional.
   *
   * Invoked on click (or keyboard activation) of a row NOT on its action
   * buttons. Returning a Promise lets the engine display a per-row busy
   * indicator until the promise settles. Engine calls `event.stopPropagation`
   * on action-button clicks, so consumers don't need to hand-wire the
   * "click the button, not the row" distinction.
   */
  onRowActivate?: (row: T) => Promise<void> | void;

  /** Per-row action buttons. Optional. */
  rowActions?: ReadonlyArray<DataTableRowAction<T, TId>>;

  /**
   * Multi-row bulk actions. Optional.
   *
   * Merged with `DataTableConfig.bulkActions` — adapter's actions come first,
   * then config's. Selection-aware enablement honors each action's
   * `minSelection` / `maxSelection`.
   */
  bulkActions?: ReadonlyArray<DataTableBulkAction<T, TId>>;

  /**
   * Invalidate adapter caches. Optional.
   *
   * Engine calls `invalidate()` after any successful rowAction / bulkAction
   * `onExecute`, before the follow-up `fetchPage()`. Adapter clears its
   * memoized pages, in-flight dedup tables, etc. Returning a Promise lets
   * the engine wait for the invalidation before refetching.
   */
  invalidate?: () => Promise<void> | void;
}

// --- Engine config ---

export interface DataTableConfig<T extends DataTableRow> {
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Data: array (client-side) or server data source */
  data: DataSource<T>;
  /** Sorting configuration */
  sorting?: SortingConfig;
  /** Filtering configuration */
  filtering?: FilteringConfig;
  /** Pagination configuration */
  pagination?: PaginationConfig;
  /** Selection configuration */
  selection?: SelectionConfig;
  /** Bulk actions shown when rows selected */
  bulkActions?: BulkAction<T>[];
  /** Callback when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Callback when sort changes */
  onSort?: (sorts: SortState[]) => void;
  /** Callback when filter changes */
  onFilter?: (filters: Record<string, string>) => void;
  /** Callback when page changes */
  onPageChange?: (params: { page: number; pageSize: number }) => void;
  /** Callback when selection changes */
  onSelectionChange?: (rows: T[]) => void;
  /** Virtual scrolling for large datasets. Default: false */
  virtualScroll?: boolean;
  /** Custom loading state */
  loadingState?: ReactNode;
  /** Custom empty state */
  emptyState?: ReactNode;
  /** Custom error state (receives retry callback) */
  errorState?: ReactNode;
  /** Loading indicator. Default: false */
  loading?: boolean;
  /** Error message. When set, shows error state */
  error?: string | null;
  /** Retry callback for error state */
  onRetry?: () => void;
  /** Additional CSS class for composition */
  className?: string;
  /** Accessible label for the table */
  'aria-label'?: string;
  /** Row height in px for virtual scrolling. Default: 48 */
  rowHeight?: number;
  /** Enable expandable rows. Default: false */
  expandable?: boolean;
  /** Render function for expanded row content */
  expandContent?: (row: T) => ReactNode;
  /**
   * Stable row-id extractor. Returned value is used as the React key for each
   * row AND as the identity in the selection/expansion sets. If omitted, the
   * engine falls back to `row['id']` (when present) and then to the row index.
   *
   * Supply this when the primary key field is not named `id` (e.g.
   * `payslip_id`, `document_uuid`) or when the row id is a composite.
   */
  getRowId?: (row: T, index: number) => string;
}

// --- Internal resolved state ---

export interface ResolvedTableState<T extends DataTableRow> {
  /** Processed rows after sort/filter/pagination (client-side) */
  displayRows: T[];
  /** Total row count before pagination */
  totalCount: number;
  /** Current page (0-indexed internally) */
  page: number;
  /** Current page size */
  pageSize: number;
  /** Active sorts */
  sorts: SortState[];
  /** Active column filters */
  filters: Record<string, string>;
  /** Global search query */
  globalSearch: string;
  /** Selected row indices (by stringified index or id) */
  selectedIds: Set<string>;
  /** Current data state */
  status: 'idle' | 'loading' | 'error' | 'empty';
}
