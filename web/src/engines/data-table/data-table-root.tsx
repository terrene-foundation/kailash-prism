/**
 * DataTable Engine — Root component
 * Spec: docs/specs/05-engine-specifications.md § 5.1
 * Contract: specs/components/data-table.yaml
 *
 * Composes sub-components: header, body, pagination, bulk actions, states, mobile.
 * Uses @tanstack/react-virtual for virtual scrolling.
 * All styling via CSS custom properties from the Theme engine.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DataTableConfig, DataTableRow } from './types.js';
import { useDataTable } from './use-data-table.js';
import { DataTableHeader } from './data-table-header.js';
import { DataTableBody } from './data-table-body.js';
import { DataTablePagination } from './data-table-pagination.js';
import { DataTableBulkActions } from './data-table-bulk-actions.js';
import { DataTableLoading, DataTableEmpty, DataTableError } from './data-table-states.js';
import { DataTableMobile } from './data-table-mobile.js';

// --- Styles ---

const tableContainerStyle: React.CSSProperties = {
  width: '100%',
  overflow: 'auto',
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
  borderRadius: 'var(--prism-data-table-default-radius, 8px)',
  border: '1px solid var(--prism-data-table-row-border, var(--prism-color-border-default, #E2E8F0))',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

const globalSearchStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '320px',
  padding: '8px 12px',
  border: '1px solid var(--prism-color-border-default, #CBD5E1)',
  borderRadius: 'var(--prism-data-table-default-radius, 4px)',
  fontSize: 'var(--prism-typography-body-size, 0.875rem)',
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const MOBILE_BREAKPOINT = 768;

// --- Component ---

export function DataTable<T extends DataTableRow>(props: DataTableConfig<T>) {
  const {
    columns,
    sorting,
    filtering,
    pagination,
    selection,
    bulkActions = [],
    virtualScroll = false,
    loading = false,
    error = null,
    onRetry,
    loadingState: customLoadingState,
    emptyState: customEmptyState,
    errorState: customErrorState,
    className,
    'aria-label': ariaLabel,
    rowHeight = 48,
    expandable = false,
    expandContent,
  } = props;

  const state = useDataTable(props);

  // --- Responsive: detect mobile ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => { setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); };
    check();
    window.addEventListener('resize', check);
    return () => { window.removeEventListener('resize', check); };
  }, []);

  // --- Derived booleans ---
  const sortingEnabled = sorting?.enabled !== false;
  const filteringEnabled = filtering?.enabled !== false;
  const globalSearchEnabled = filtering?.globalSearch !== false && filteringEnabled;
  const paginationEnabled = pagination?.enabled !== false;
  const selectionEnabled = selection?.enabled === true;
  const pageSizeOptions = pagination?.pageSizeOptions ?? [10, 25, 50, 100];

  // --- Column count for colSpan ---
  const columnCount = columns.length + (selectionEnabled ? 1 : 0) + (expandable ? 1 : 0);

  // --- Global search handler (debounced concept — immediate for now, consumer can debounce) ---
  const handleGlobalSearchInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      state.handleGlobalSearch(e.target.value);
    },
    [state.handleGlobalSearch],
  );

  // --- Live announcement for selection changes ---
  const selectionAnnouncement = useMemo(() => {
    if (!selectionEnabled) return '';
    if (state.selectedIds.size === 0) return '';
    return `${String(state.selectedIds.size)} row${state.selectedIds.size !== 1 ? 's' : ''} selected`;
  }, [selectionEnabled, state.selectedIds.size]);

  // --- Render ---

  // Determine table state
  const isLoading = loading;
  const hasError = error != null;
  const isEmpty = !isLoading && !hasError && state.displayRows.length === 0;
  const hasData = !isLoading && !hasError && state.displayRows.length > 0;

  return (
    <div
      className={className}
      style={{ width: '100%' }}
    >
      {/* Global search */}
      {globalSearchEnabled && (
        <div style={{ marginBottom: '12px' }}>
          <input
            type="search"
            value={state.globalSearch}
            onChange={handleGlobalSearchInput}
            placeholder="Search all columns..."
            aria-label="Search all columns"
            style={globalSearchStyle}
          />
        </div>
      )}

      {/* Bulk actions bar */}
      {selectionEnabled && bulkActions.length > 0 && (
        <DataTableBulkActions
          selectedCount={state.selectedIds.size}
          selectedRows={state.selectedRows}
          actions={bulkActions}
          onClearSelection={state.clearSelection}
        />
      )}

      {/* Mobile card layout */}
      {isMobile && hasData ? (
        <>
          <DataTableMobile
            rows={state.displayRows}
            columns={columns}
            selectionEnabled={selectionEnabled}
            selectedIds={state.selectedIds}
            onRowClick={props.onRowClick}
            onToggleRow={state.handleToggleRow}
            getRowId={state.getRowId}
          />
          {paginationEnabled && (
            <DataTablePagination
              page={state.page}
              pageSize={state.pageSize}
              totalCount={state.totalCount}
              pageSizeOptions={pageSizeOptions}
              onPageChange={state.handlePageChange}
              onPageSizeChange={state.handlePageSizeChange}
            />
          )}
        </>
      ) : (
        /* Desktop table layout */
        <div style={tableContainerStyle}>
          <table
            role="grid"
            aria-label={ariaLabel ?? 'Data table'}
            aria-busy={isLoading}
            aria-rowcount={state.totalCount}
            style={tableStyle}
          >
            <DataTableHeader
              columns={columns}
              sorts={state.sorts}
              filters={state.filters}
              sortingEnabled={sortingEnabled}
              filteringEnabled={filteringEnabled}
              selectionEnabled={selectionEnabled}
              allSelected={state.allSelected}
              someSelected={state.someSelected}
              onSort={state.handleSort}
              onMultiSort={state.handleMultiSort}
              onFilterChange={state.handleFilterChange}
              onSelectAll={state.handleSelectAll}
            />

            {isLoading && (
              <DataTableLoading
                columnCount={columnCount}
                customContent={customLoadingState}
              />
            )}

            {hasError && (
              <DataTableError
                columnCount={columnCount}
                error={error}
                onRetry={onRetry}
                customContent={customErrorState}
              />
            )}

            {isEmpty && (
              <DataTableEmpty
                columnCount={columnCount}
                customContent={customEmptyState}
              />
            )}

            {hasData && (
              <DataTableBody
                rows={state.displayRows}
                columns={columns}
                selectionEnabled={selectionEnabled}
                selectedIds={state.selectedIds}
                virtualScroll={virtualScroll}
                rowHeight={rowHeight}
                onRowClick={props.onRowClick}
                onToggleRow={state.handleToggleRow}
                getRowId={state.getRowId}
                expandable={expandable}
                expandedIds={state.expandedIds}
                onToggleExpand={state.handleToggleExpand}
                expandContent={expandContent}
              />
            )}
          </table>

          {paginationEnabled && !isLoading && !hasError && (
            <DataTablePagination
              page={state.page}
              pageSize={state.pageSize}
              totalCount={state.totalCount}
              pageSizeOptions={pageSizeOptions}
              onPageChange={state.handlePageChange}
              onPageSizeChange={state.handlePageSizeChange}
            />
          )}
        </div>
      )}

      {/* Live region for selection announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {selectionAnnouncement}
      </div>
    </div>
  );
}
