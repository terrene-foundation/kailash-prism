/**
 * DataTable Engine — barrel export
 * All public types and components re-exported from here.
 */

export type {
  DataTableConfig,
  DataTableRow,
  ColumnDef,
  SortingConfig,
  FilteringConfig,
  PaginationConfig,
  SelectionConfig,
  BulkAction,
  DataSource,
  ServerDataSource,
  ServerFetchParams,
  ServerFetchResult,
  SortState,
} from './types.js';

export { DataTable } from './data-table-root.js';
export { useDataTable } from './use-data-table.js';
