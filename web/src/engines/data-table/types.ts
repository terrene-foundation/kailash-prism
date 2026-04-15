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
 * Static data: plain array — the engine sorts / filters / paginates client-side.
 * Server-side: a `ServerDataSource` whose `fetchData(params)` is invoked by the
 * engine on mount and on every page / sort / filter / search change. The engine
 * owns the `loading` / `error` lifecycle for server sources automatically.
 */
export type DataSource<T extends DataTableRow> =
  | T[]
  | ServerDataSource<T>;

export interface ServerDataSource<T extends DataTableRow> {
  /**
   * Called by `useDataTable` whenever pagination / sort / filter / global
   * search state changes. Must return the current page of rows plus the
   * total count so the pagination footer can render page counts correctly.
   *
   * The engine uses an `AbortController` to cancel in-flight requests when
   * the query params change — implementations MAY observe `params.signal` and
   * abort the underlying fetch; stale results from cancelled requests are
   * discarded by the engine regardless.
   */
  fetchData: (params: ServerFetchParams) => Promise<ServerFetchResult<T>>;
}

export interface ServerFetchParams {
  page: number;
  pageSize: number;
  sort: SortState[];
  filters: Record<string, string>;
  globalSearch: string;
  /**
   * Optional abort signal from the engine. Firing when query params change,
   * so adapters that forward to `fetch()` can honour cancellation. Stale
   * results from aborted requests are discarded by the engine regardless.
   */
  signal?: AbortSignal;
}

export interface ServerFetchResult<T extends DataTableRow> {
  items: T[];
  totalCount: number;
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
