/**
 * DataTable Body — Row rendering with optional virtual scrolling
 * Sub-component of DataTable engine
 */

import { useRef, useCallback, type KeyboardEvent, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDef, DataTableRow, DataTableRowAction } from './types.js';
import { sanitizeHref } from './sanitize-href.js';

// --- Styles ---

const rowStyle: React.CSSProperties = {
  backgroundColor: 'var(--prism-data-table-row-bg, var(--prism-color-surface-page, #FFFFFF))',
  borderBottom: '1px solid var(--prism-data-table-row-border, var(--prism-color-border-default, #E2E8F0))',
  transition: 'background-color 0.15s ease',
};

const selectedRowStyle: React.CSSProperties = {
  ...rowStyle,
  backgroundColor: 'var(--prism-data-table-row-selected-bg, var(--prism-color-interactive-primary-subtle, #EFF6FF))',
};

const cellStyle: React.CSSProperties = {
  padding: 'var(--prism-data-table-cell-padding, 12px 16px)',
  fontSize: 'var(--prism-typography-body-size, 0.875rem)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// --- Props ---

interface DataTableBodyProps<T extends DataTableRow, TId = string> {
  rows: T[];
  columns: ColumnDef<T>[];
  selectionEnabled: boolean;
  selectedIds: Set<string>;
  virtualScroll: boolean;
  rowHeight: number;
  onRowClick: ((row: T, id: TId) => void | Promise<void>) | undefined;
  onToggleRow: (index: number) => void;
  getRowId: (row: T, index: number) => string;
  getTypedRowId: (row: T, index: number) => TId;
  expandable: boolean;
  expandedIds: Set<string>;
  onToggleExpand: (index: number) => void;
  expandContent?: ((row: T) => ReactNode) | undefined;
  /**
   * Per-row actions from the DataTableAdapter. When present AND non-empty,
   * a trailing "Actions" column is rendered. Empty array → no column.
   */
  rowActions?: ReadonlyArray<DataTableRowAction<T, TId>> | undefined;
  /**
   * Invoked when a user clicks an action button. The engine awaits the
   * action's onExecute, calls adapter.invalidate(), and refetches.
   */
  executeRowAction?: ((action: DataTableRowAction<T, TId>, row: T, rowIndex: number) => Promise<void>) | undefined;
}

// --- Component ---

export function DataTableBody<T extends DataTableRow, TId = string>({
  rows,
  columns,
  selectionEnabled,
  selectedIds,
  virtualScroll,
  rowHeight,
  onRowClick,
  onToggleRow,
  getRowId,
  getTypedRowId,
  expandable,
  expandedIds,
  onToggleExpand,
  expandContent,
  rowActions,
  executeRowAction,
}: DataTableBodyProps<T, TId>) {
  const hasActions = rowActions !== undefined && rowActions.length > 0;

  if (virtualScroll) {
    return (
      <VirtualBody<T, TId>
        rows={rows}
        columns={columns}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        rowHeight={rowHeight}
        onRowClick={onRowClick}
        onToggleRow={onToggleRow}
        getRowId={getRowId}
        getTypedRowId={getTypedRowId}
        rowActions={rowActions}
        executeRowAction={executeRowAction}
      />
    );
  }

  const columnCount =
    columns.length +
    (selectionEnabled ? 1 : 0) +
    (expandable ? 1 : 0) +
    (hasActions ? 1 : 0);

  return (
    <tbody>
      {rows.map((row, index) => {
        const id = getRowId(row, index);
        const typedId = getTypedRowId(row, index);
        const isSelected = selectedIds.has(id);
        const isExpanded = expandable && expandedIds.has(id);
        return (
          <TableRow<T, TId>
            key={id}
            row={row}
            index={index}
            typedId={typedId}
            columns={columns}
            selectionEnabled={selectionEnabled}
            isSelected={isSelected}
            onRowClick={onRowClick}
            onToggleRow={onToggleRow}
            expandable={expandable}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
            expandContent={expandContent}
            columnCount={columnCount}
            rowActions={rowActions}
            executeRowAction={executeRowAction}
          />
        );
      })}
    </tbody>
  );
}

// --- Virtual scrolling body ---

interface VirtualBodyProps<T extends DataTableRow, TId = string> {
  rows: T[];
  columns: ColumnDef<T>[];
  selectionEnabled: boolean;
  selectedIds: Set<string>;
  rowHeight: number;
  onRowClick: ((row: T, id: TId) => void | Promise<void>) | undefined;
  onToggleRow: (index: number) => void;
  getRowId: (row: T, index: number) => string;
  getTypedRowId: (row: T, index: number) => TId;
  rowActions?: ReadonlyArray<DataTableRowAction<T, TId>> | undefined;
  executeRowAction?: ((action: DataTableRowAction<T, TId>, row: T, rowIndex: number) => Promise<void>) | undefined;
}

function VirtualBody<T extends DataTableRow, TId = string>({
  rows,
  columns,
  selectionEnabled,
  selectedIds,
  rowHeight,
  onRowClick,
  onToggleRow,
  getRowId,
  getTypedRowId,
  rowActions,
  executeRowAction,
}: VirtualBodyProps<T, TId>) {
  const parentRef = useRef<HTMLTableSectionElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 5,
  });

  return (
    <tbody
      ref={parentRef}
      style={{
        display: 'block',
        height: '400px',
        overflow: 'auto',
      }}
    >
      <tr style={{ height: `${String(virtualizer.getTotalSize())}px`, display: 'block', position: 'relative' }}>
        <td style={{ padding: 0, border: 'none' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            const id = getRowId(row, virtualRow.index);
            const typedId = getTypedRowId(row, virtualRow.index);
            const isSelected = selectedIds.has(id);
            return (
              <div
                key={id}
                data-index={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${String(virtualRow.size)}px`,
                  transform: `translateY(${String(virtualRow.start)}px)`,
                  display: 'table',
                  tableLayout: 'fixed',
                }}
              >
                <TableRow<T, TId>
                  row={row}
                  index={virtualRow.index}
                  typedId={typedId}
                  columns={columns}
                  selectionEnabled={selectionEnabled}
                  isSelected={isSelected}
                  onRowClick={onRowClick}
                  onToggleRow={onToggleRow}
                  rowActions={rowActions}
                  executeRowAction={executeRowAction}
                />
              </div>
            );
          })}
        </td>
      </tr>
    </tbody>
  );
}

// --- Individual row ---

interface TableRowProps<T extends DataTableRow, TId = string> {
  row: T;
  index: number;
  /** Typed row id for callback surfaces (since 0.4.0). */
  typedId: TId;
  columns: ColumnDef<T>[];
  selectionEnabled: boolean;
  isSelected: boolean;
  onRowClick?: ((row: T, id: TId) => void | Promise<void>) | undefined;
  onToggleRow: (index: number) => void;
  expandable?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: ((index: number) => void) | undefined;
  expandContent?: ((row: T) => ReactNode) | undefined;
  columnCount?: number;
  rowActions?: ReadonlyArray<DataTableRowAction<T, TId>> | undefined;
  executeRowAction?: ((action: DataTableRowAction<T, TId>, row: T, rowIndex: number) => Promise<void>) | undefined;
}

function TableRow<T extends DataTableRow, TId = string>({
  row,
  index,
  typedId,
  columns,
  selectionEnabled,
  isSelected,
  onRowClick,
  onToggleRow,
  expandable,
  isExpanded,
  onToggleExpand,
  expandContent,
  columnCount,
  rowActions,
  executeRowAction,
}: TableRowProps<T, TId>) {
  const hasActions = rowActions !== undefined && rowActions.length > 0;

  const handleClick = useCallback(() => {
    void onRowClick?.(row, typedId);
  }, [row, typedId, onRowClick]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === 'Enter' && onRowClick) {
        e.preventDefault();
        void onRowClick(row, typedId);
      }
    },
    [row, typedId, onRowClick],
  );

  const handleCheckboxChange = useCallback(() => {
    onToggleRow(index);
  }, [index, onToggleRow]);

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand?.(index);
    },
    [index, onToggleExpand],
  );

  return (
    <>
      <tr
        role="row"
        style={isSelected ? selectedRowStyle : rowStyle}
        onClick={onRowClick ? handleClick : undefined}
        onKeyDown={onRowClick ? handleKeyDown : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        aria-selected={selectionEnabled ? isSelected : undefined}
        aria-expanded={expandable ? isExpanded : undefined}
        data-testid={`data-table-row-${String(index)}`}
      >
        {expandable && (
          <td style={{ ...cellStyle, width: '36px', textAlign: 'center', cursor: 'pointer', padding: '8px' }}>
            <button
              onClick={handleExpandClick}
              aria-label={isExpanded ? `Collapse row ${String(index + 1)}` : `Expand row ${String(index + 1)}`}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: 'var(--prism-color-text-secondary, #64748B)',
                padding: 4,
                transition: 'transform 150ms',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              ▶
            </button>
          </td>
        )}
        {selectionEnabled && (
          <td style={{ ...cellStyle, width: '48px', textAlign: 'center' }}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              onClick={(e) => { e.stopPropagation(); }}
              aria-label={`Select row ${String(index + 1)}`}
            />
          </td>
        )}
        {columns.map((col) => {
          const value = row[col.field];
          return (
            <td
              key={col.field}
              style={{ ...cellStyle, textAlign: col.align ?? 'left' }}
              role="gridcell"
            >
              {col.render
                ? col.render(value, row)
                : String(value ?? '')}
            </td>
          );
        })}
        {hasActions && rowActions && (
          <td
            style={{ ...cellStyle, textAlign: 'right', whiteSpace: 'nowrap' }}
            role="gridcell"
            onClick={(e) => { e.stopPropagation(); }}
            data-testid={`data-table-row-actions-${String(index)}`}
          >
            <RowActionsCell<T, TId>
              actions={rowActions}
              row={row}
              rowIndex={index}
              typedId={typedId}
              executeRowAction={executeRowAction}
            />
          </td>
        )}
      </tr>
      {isExpanded && expandContent && (
        <tr data-testid={`data-table-expanded-${String(index)}`}>
          <td
            colSpan={columnCount}
            style={{
              padding: 16,
              backgroundColor: 'var(--prism-color-surface-elevated, #F8FAFC)',
              borderBottom: '1px solid var(--prism-color-border-default, #E2E8F0)',
            }}
          >
            {expandContent(row)}
          </td>
        </tr>
      )}
    </>
  );
}

// --- Row actions cell ---
//
// Renders the trailing actions column for a single row. Each action is an
// anchor (if `href` supplied) or a button (if `onExecute` supplied) — exactly
// one of those MUST be defined per the adapter contract. Keyboard order is
// the declared action order; visibility and disabled state honor the
// per-row predicates.

interface RowActionsCellProps<T extends DataTableRow, TId = string> {
  actions: ReadonlyArray<DataTableRowAction<T, TId>>;
  row: T;
  rowIndex: number;
  executeRowAction?: ((action: DataTableRowAction<T, TId>, row: T, rowIndex: number) => Promise<void>) | undefined;
}

const actionButtonBaseStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--prism-data-table-default-radius, 4px)',
  fontSize: 'var(--prism-typography-caption-size, 0.75rem)',
  cursor: 'pointer',
  background: 'transparent',
  border: '1px solid var(--prism-color-border-default, #CBD5E1)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  marginLeft: 4,
  textDecoration: 'none',
  display: 'inline-block',
};

const destructiveStyle: React.CSSProperties = {
  ...actionButtonBaseStyle,
  borderColor: 'var(--prism-color-status-error, #DC2626)',
  color: 'var(--prism-color-status-error, #DC2626)',
};

const primaryStyle: React.CSSProperties = {
  ...actionButtonBaseStyle,
  backgroundColor: 'var(--prism-color-interactive-primary, #2563EB)',
  borderColor: 'var(--prism-color-interactive-primary, #2563EB)',
  color: 'var(--prism-color-text-on-primary, #FFFFFF)',
};

function variantStyle(variant: DataTableRowAction<DataTableRow>['variant']): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return primaryStyle;
    case 'destructive':
      return destructiveStyle;
    case 'secondary':
    case 'ghost':
    default:
      return actionButtonBaseStyle;
  }
}

// `sanitizeHref` lives in `./sanitize-href.js` so both table-mode and
// card-grid-mode action renderers share the same allowlist.

function RowActionsCell<T extends DataTableRow, TId = string>({
  actions,
  row,
  rowIndex,
  typedId,
  executeRowAction,
}: RowActionsCellProps<T, TId> & { typedId: TId }) {
  return (
    <div role="group" aria-label="Row actions" style={{ display: 'inline-flex', gap: 4 }}>
      {actions.map((action) => {
        if (action.visible && !action.visible(row)) return null;
        const disabled = action.disabled?.(row) ?? false;

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
                ...variantStyle(action.variant),
                opacity: disabled ? 0.5 : 1,
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
            style={{
              ...variantStyle(action.variant),
              opacity: disabled ? 0.5 : 1,
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!executeRowAction) return;
              void executeRowAction(action, row, rowIndex);
            }}
          >
            {action.icon}{action.label}
          </button>
        );
      })}
    </div>
  );
}
