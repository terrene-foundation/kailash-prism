/**
 * DataTable Engine — Shared types
 * Spec: docs/specs/05-engine-specifications.md § 5.1
 */

import type { ReactNode } from 'react';

// --- Row type ---

/** Generic row type — consumers provide their own shape */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DataTableRow = Record<string, unknown>;

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
  /** Custom cell renderer */
  render?: (value: unknown, row: T) => ReactNode;
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
 * Static data: plain array.
 * Server-side: callback returning paginated data.
 */
export type DataSource<T extends DataTableRow> =
  | T[]
  | ServerDataSource<T>;

export interface ServerDataSource<T extends DataTableRow> {
  fetchData: (params: ServerFetchParams) => Promise<ServerFetchResult<T>>;
}

export interface ServerFetchParams {
  page: number;
  pageSize: number;
  sort: SortState[];
  filters: Record<string, string>;
  globalSearch: string;
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
