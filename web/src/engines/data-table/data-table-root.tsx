/**
 * DataTable Engine — Root component
 * Spec: docs/specs/05-engine-specifications.md § 5.1
 * Contract: specs/components/data-table.yaml
 *
 * Composes sub-components: header, body, pagination, bulk actions, states, mobile.
 * Uses @tanstack/react-virtual for virtual scrolling.
 * All styling via CSS custom properties from the Theme engine.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DataTableConfig, DataTableRow, DataTableRowAction } from './types.js';
import { useDataTable } from './use-data-table.js';
import { DataTableHeader } from './data-table-header.js';
import { DataTableBody } from './data-table-body.js';
import { DataTablePagination } from './data-table-pagination.js';
import { DataTableBulkActions } from './data-table-bulk-actions.js';
import { DataTableLoading, DataTableEmpty, DataTableError } from './data-table-states.js';
import { DataTableMobile } from './data-table-mobile.js';
import { sanitizeHref } from './sanitize-href.js';
import { Card } from '../../atoms/card.js';
import { CardGrid } from '../../organisms/card-grid.js';

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

export function DataTable<T extends DataTableRow, TId = string>(
  props: DataTableConfig<T, TId>,
) {
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
    display = 'table',
    renderCard,
    cardGridColumns,
    globalSearchPlaceholder,
  } = props;

  const state = useDataTable<T, TId>(props);

  // Detect whether data is an adapter (vs plain array) so the engine can
  // auto-manage the loading / error surface without the consumer having
  // to wire up both `loading`/`error` and the server fetch manually.
  //
  // Discrimination: anything non-array-shaped is treated as adapter-driven;
  // the hook's `resolveDataSource` surfaces serverLoading / serverError.
  const isServerSource =
    typeof props.data === 'object' &&
    props.data !== null &&
    !Array.isArray(props.data);
  const effectiveLoading = isServerSource ? loading || state.serverLoading : loading;
  const effectiveError = isServerSource ? error ?? state.serverError : error;
  const effectiveRetry = isServerSource
    ? (onRetry ?? state.retryServerFetch)
    : onRetry;

  // Merge adapter-driven bulk actions with consumer-supplied bulkActions.
  // Adapter's actions come first so consumers can extend (not override)
  // the adapter's declared set.
  const mergedBulkActions = useMemo(() => {
    if (state.adapterBulkActions.length === 0) return bulkActions;
    return [
      ...state.adapterBulkActions.map(a => ({
        label: a.label,
        variant: (a.variant === 'destructive' ? 'destructive' : a.variant === 'primary' ? 'primary' : 'ghost') as 'primary' | 'destructive' | 'ghost',
        onExecute: (_rows: T[]) => {
          // Fire-and-forget wrapper; adapter-side onExecute may return a
          // Promise. Engine handles invalidate+refetch via executeBulkAction.
          void state.executeBulkAction(a);
        },
      })),
      ...bulkActions,
    ];
  }, [state.adapterBulkActions, state.executeBulkAction, bulkActions]);

  // Prefer adapter.onRowActivate over consumer's onRowClick. Both fire on
  // row click; adapter path takes precedence because it's part of the
  // typed contract.
  //
  // adapter.onRowActivate keeps its single-arg `(row)` calling convention
  // because that is the typed contract. config.onRowClick receives
  // `(row, id: TId)` (since 0.4.0). The `effectiveRowClick` closure
  // normalises both shapes into `(row, id)` so sub-components can invoke
  // one callback shape regardless of which surface supplied the handler.
  //
  // In `display="card-grid"` mode this handler is wired to Card.onActivate,
  // so a card click (or Enter/Space keyboard activation) follows the same
  // precedence — adapter-level onRowActivate wins, config-level onRowClick
  // is the fallback. (See CHANGELOG 0.4.0 G-5 for the documentation
  // clarification accompanying this wiring.)
  const adapterOnRowActivate = state.onRowActivate;
  const configOnRowClick = props.onRowClick;
  const effectiveRowClick: ((row: T, id: TId) => void | Promise<void>) | undefined =
    adapterOnRowActivate !== undefined
      ? (row: T, _id: TId) => adapterOnRowActivate(row)
      : configOnRowClick;

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
  const isLoading = effectiveLoading;
  const hasError = effectiveError != null;
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
            placeholder={globalSearchPlaceholder ?? 'Search all columns...'}
            aria-label="Search all columns"
            style={globalSearchStyle}
          />
        </div>
      )}

      {/* Bulk actions bar (adapter + config merged) */}
      {selectionEnabled && mergedBulkActions.length > 0 && (
        <DataTableBulkActions
          selectedCount={state.selectedIds.size}
          selectedRows={state.selectedRows}
          actions={mergedBulkActions}
          onClearSelection={state.clearSelection}
        />
      )}

      {/* Card-grid layout (since 0.3.1) — renders rows as Cards instead
          of a tabular grid. Takes precedence over both mobile and desktop
          table rendering when display === 'card-grid'. Mobile still gets
          the single-column default from CardGrid's responsive config. */}
      {display === 'card-grid' && hasData ? (
        <>
          <CardGrid
            {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
            {...(cardGridColumns !== undefined ? { columns: cardGridColumns } : {})}
          >
            {state.displayRows.map((row, index) => {
              const typedId = state.getTypedRowId(row, index);
              return (
                <CardItem<T, TId>
                  key={state.getRowId(row, index)}
                  row={row}
                  rowIndex={index}
                  typedId={typedId}
                  columns={columns}
                  renderCard={renderCard}
                  rowActions={state.rowActions}
                  executeRowAction={state.executeRowAction}
                  {...(effectiveRowClick !== undefined
                    ? { onActivate: () => { void effectiveRowClick(row, typedId); } }
                    : {})}
                />
              );
            })}
          </CardGrid>
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
        </>
      ) : display === 'card-grid' && isLoading ? (
        <DataTableCardGridLoading columns={cardGridColumns} customContent={customLoadingState} />
      ) : display === 'card-grid' && hasError ? (
        <DataTableCardGridError error={effectiveError} onRetry={effectiveRetry} customContent={customErrorState} />
      ) : display === 'card-grid' && isEmpty ? (
        <DataTableCardGridEmpty customContent={customEmptyState} />
      ) : /* Mobile card layout (table mode only) */
      isMobile && hasData ? (
        <>
          <DataTableMobile<T, TId>
            rows={state.displayRows}
            columns={columns}
            selectionEnabled={selectionEnabled}
            selectedIds={state.selectedIds}
            onRowClick={effectiveRowClick}
            onToggleRow={state.handleToggleRow}
            getRowId={state.getRowId}
            getTypedRowId={state.getTypedRowId}
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
                error={effectiveError}
                onRetry={effectiveRetry}
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
              <DataTableBody<T, TId>
                rows={state.displayRows}
                columns={columns}
                selectionEnabled={selectionEnabled}
                selectedIds={state.selectedIds}
                virtualScroll={virtualScroll}
                rowHeight={rowHeight}
                onRowClick={effectiveRowClick}
                onToggleRow={state.handleToggleRow}
                getRowId={state.getRowId}
                getTypedRowId={state.getTypedRowId}
                expandable={expandable}
                expandedIds={state.expandedIds}
                onToggleExpand={state.handleToggleExpand}
                expandContent={expandContent}
                rowActions={state.rowActions}
                executeRowAction={state.executeRowAction}
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

// --- Card-grid mode support ---

/**
 * Renders a single row as a Card. Uses `renderCard` when supplied,
 * otherwise falls back to a reasonable default — first column as title,
 * second column as subtitle, remaining columns as key/value pairs.
 *
 * Row actions render in the card footer. The card is interactive when
 * onActivate is supplied.
 */
interface CardItemProps<T extends DataTableRow, TId = string> {
  row: T;
  rowIndex: number;
  /** Typed row id — forwarded to `action.href(row, id)` for TId parity. */
  typedId: TId;
  columns: DataTableConfig<T, TId>['columns'];
  renderCard?: ((row: T, rowIndex: number) => ReactNode) | undefined;
  rowActions: ReadonlyArray<DataTableRowAction<T, TId>>;
  executeRowAction: (action: DataTableRowAction<T, TId>, row: T, rowIndex: number) => Promise<void>;
  onActivate?: (() => void) | undefined;
}

function CardItem<T extends DataTableRow, TId = string>({
  row,
  rowIndex,
  typedId,
  columns,
  renderCard,
  rowActions,
  executeRowAction,
  onActivate,
}: CardItemProps<T, TId>) {
  const body = renderCard ? renderCard(row, rowIndex) : defaultCardBody(row, columns);
  const titleColumn = columns[0];
  const subtitleColumn = columns[1];

  const title = titleColumn && !renderCard
    ? String((row as Record<string, unknown>)[titleColumn.field] ?? '')
    : undefined;
  const subtitle = subtitleColumn && !renderCard
    ? String((row as Record<string, unknown>)[subtitleColumn.field] ?? '')
    : undefined;

  const footer = rowActions.length > 0 ? (
    <div
      role="group"
      aria-label="Row actions"
      style={{ display: 'inline-flex', gap: 4 }}
      onClick={(e) => { e.stopPropagation(); }}
    >
      {rowActions.map((action) => {
        if (action.visible && !action.visible(row)) return null;
        const disabled = action.disabled?.(row) ?? false;
        const actionStyle: React.CSSProperties = {
          padding: '4px 10px',
          borderRadius: 'var(--prism-radius-md, 4px)',
          fontSize: 'var(--prism-typography-caption-size, 0.75rem)',
          background: action.variant === 'primary' ? 'var(--prism-color-interactive-primary, #2563EB)' : 'transparent',
          color: action.variant === 'primary' ? 'var(--prism-color-text-on-primary, #FFFFFF)' : 'var(--prism-color-text-primary, #0F172A)',
          border: action.variant === 'destructive' ? '1px solid var(--prism-color-status-error, #DC2626)' : '1px solid var(--prism-color-border-default, #CBD5E1)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          textDecoration: 'none',
          display: 'inline-block',
        };

        // Anchor branch — parity with table-mode RowActionsCell. `href` is
        // sanitized against scheme allowlist; click stopPropagation
        // prevents card activation.
        if (action.href) {
          const href = sanitizeHref(action.href(row, typedId));
          return (
            <a
              key={action.id}
              href={href}
              aria-label={action.label}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : 0}
              style={{
                ...actionStyle,
                pointerEvents: disabled ? 'none' : 'auto',
              }}
              onClick={(e) => { e.stopPropagation(); }}
            >
              {action.icon}{action.label}
            </a>
          );
        }

        return (
          <button
            key={action.id}
            type="button"
            aria-label={action.label}
            disabled={disabled}
            style={actionStyle}
            onClick={(e) => {
              e.stopPropagation();
              void executeRowAction(action, row, rowIndex);
            }}
          >
            {action.icon}{action.label}
          </button>
        );
      })}
    </div>
  ) : undefined;

  return (
    <Card
      {...(title !== undefined ? { title } : {})}
      {...(subtitle !== undefined && subtitle !== '' ? { subtitle } : {})}
      {...(footer !== undefined ? { footer } : {})}
      {...(onActivate !== undefined ? { onActivate } : {})}
      data-testid={`data-table-card-${String(rowIndex)}`}
    >
      {body}
    </Card>
  );
}

function defaultCardBody<T extends DataTableRow>(
  row: T,
  columns: DataTableConfig<T>['columns'],
): ReactNode {
  // Skip first two columns — used as title + subtitle. Rest render as
  // key: value pairs for a minimum-viable card body.
  const bodyColumns = columns.slice(2);
  if (bodyColumns.length === 0) return null;
  return (
    <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {bodyColumns.map(col => {
        const value = (row as Record<string, unknown>)[col.field];
        return (
          <div key={col.field} style={{ display: 'flex', gap: 8, fontSize: 'var(--prism-font-size-caption, 12px)' }}>
            <dt style={{ color: 'var(--prism-color-text-secondary, #64748B)', margin: 0 }}>{col.header}:</dt>
            <dd style={{ color: 'var(--prism-color-text-primary, #0F172A)', margin: 0 }}>
              {col.render ? col.render(value as T[keyof T] | undefined, row) : String(value ?? '')}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function DataTableCardGridLoading({
  columns,
  customContent,
}: {
  columns?: { mobile?: number; tablet?: number; desktop?: number; wide?: number } | undefined;
  customContent?: ReactNode | undefined;
}) {
  if (customContent !== undefined) {
    return <div role="status" aria-busy="true">{customContent}</div>;
  }
  return (
    <CardGrid aria-label="Loading" {...(columns !== undefined ? { columns } : {})}>
      {[0, 1, 2, 3].map(i => (
        <Card
          key={i}
          title="Loading..."
          aria-busy
          style={{ minHeight: 120, opacity: 0.5 }}
        />
      ))}
    </CardGrid>
  );
}

function DataTableCardGridError({
  error,
  onRetry,
  customContent,
}: {
  error: string | null;
  onRetry?: (() => void) | undefined;
  customContent?: ReactNode | undefined;
}) {
  if (customContent !== undefined) {
    return <div role="alert">{customContent}</div>;
  }
  return (
    <div
      role="alert"
      style={{
        padding: 'var(--prism-spacing-md, 16px)',
        backgroundColor: 'var(--prism-color-surface-error, #FEF2F2)',
        border: '1px solid var(--prism-color-status-error, #DC2626)',
        borderRadius: 'var(--prism-radius-md, 6px)',
        color: 'var(--prism-color-status-error, #DC2626)',
      }}
    >
      <div>{error ?? 'An error occurred'}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 8,
            padding: '4px 12px',
            borderRadius: 'var(--prism-radius-md, 4px)',
            border: '1px solid var(--prism-color-status-error, #DC2626)',
            background: 'transparent',
            color: 'var(--prism-color-status-error, #DC2626)',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function DataTableCardGridEmpty({ customContent }: { customContent?: ReactNode | undefined }) {
  if (customContent !== undefined) return <>{customContent}</>;
  return (
    <div
      role="region"
      aria-label="Empty"
      style={{
        padding: 'var(--prism-spacing-lg, 32px)',
        textAlign: 'center',
        color: 'var(--prism-color-text-secondary, #64748B)',
      }}
    >
      No items to display
    </div>
  );
}
