/**
 * DataTable Engine — Public API
 * Spec: docs/specs/05-engine-specifications.md § 5.1
 *
 * Re-exports all public types and components from the data-table directory.
 * This file is the consumer-facing entry point.
 */

export {
  DataTable,
  useDataTable,
  isDataTableAdapter,
  resolveDataSource,
  type DataTableConfig,
  type DataTableRow,
  type ColumnDef,
  type SortingConfig,
  type FilteringConfig,
  type PaginationConfig,
  type SelectionConfig,
  type BulkAction,
  type DataSource,
  type SortState,
  type DataTableAdapter,
  type DataTableCapabilities,
  type DataTableQuery,
  type DataTablePage,
  type DataTableSort,
  type DataTableRowAction,
  type DataTableBulkAction,
} from './data-table/index.js';
