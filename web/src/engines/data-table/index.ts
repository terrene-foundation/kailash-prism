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
  SortState,
  DataTableAdapter,
  DataTableCapabilities,
  DataTableQuery,
  DataTablePage,
  DataTableSort,
  DataTableRowAction,
  DataTableBulkAction,
} from './types.js';

export {
  isDataTableAdapter,
  resolveDataSource,
} from './adapter.js';

export { DataTable } from './data-table-root.js';
export { useDataTable } from './use-data-table.js';
