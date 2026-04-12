/**
 * DataTable Body — Row rendering with optional virtual scrolling
 * Sub-component of DataTable engine
 */

import { useRef, useCallback, type KeyboardEvent, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ColumnDef, DataTableRow } from './types.js';

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

interface DataTableBodyProps<T extends DataTableRow> {
  rows: T[];
  columns: ColumnDef<T>[];
  selectionEnabled: boolean;
  selectedIds: Set<string>;
  virtualScroll: boolean;
  rowHeight: number;
  onRowClick: ((row: T) => void) | undefined;
  onToggleRow: (index: number) => void;
  getRowId: (row: T, index: number) => string;
  expandable: boolean;
  expandedIds: Set<string>;
  onToggleExpand: (index: number) => void;
  expandContent?: (row: T) => ReactNode;
}

// --- Component ---

export function DataTableBody<T extends DataTableRow>({
  rows,
  columns,
  selectionEnabled,
  selectedIds,
  virtualScroll,
  rowHeight,
  onRowClick,
  onToggleRow,
  getRowId,
  expandable,
  expandedIds,
  onToggleExpand,
  expandContent,
}: DataTableBodyProps<T>) {
  if (virtualScroll) {
    return (
      <VirtualBody
        rows={rows}
        columns={columns}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        rowHeight={rowHeight}
        onRowClick={onRowClick}
        onToggleRow={onToggleRow}
        getRowId={getRowId}
      />
    );
  }

  const columnCount = columns.length + (selectionEnabled ? 1 : 0) + (expandable ? 1 : 0);

  return (
    <tbody>
      {rows.map((row, index) => {
        const id = getRowId(row, index);
        const isSelected = selectedIds.has(id);
        const isExpanded = expandable && expandedIds.has(id);
        return (
          <TableRow
            key={id}
            row={row}
            index={index}
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
          />
        );
      })}
    </tbody>
  );
}

// --- Virtual scrolling body ---

interface VirtualBodyProps<T extends DataTableRow> {
  rows: T[];
  columns: ColumnDef<T>[];
  selectionEnabled: boolean;
  selectedIds: Set<string>;
  rowHeight: number;
  onRowClick: ((row: T) => void) | undefined;
  onToggleRow: (index: number) => void;
  getRowId: (row: T, index: number) => string;
}

function VirtualBody<T extends DataTableRow>({
  rows,
  columns,
  selectionEnabled,
  selectedIds,
  rowHeight,
  onRowClick,
  onToggleRow,
  getRowId,
}: VirtualBodyProps<T>) {
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
                <TableRow
                  row={row}
                  index={virtualRow.index}
                  columns={columns}
                  selectionEnabled={selectionEnabled}
                  isSelected={isSelected}
                  onRowClick={onRowClick}
                  onToggleRow={onToggleRow}
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

interface TableRowProps<T extends DataTableRow> {
  row: T;
  index: number;
  columns: ColumnDef<T>[];
  selectionEnabled: boolean;
  isSelected: boolean;
  onRowClick: ((row: T) => void) | undefined;
  onToggleRow: (index: number) => void;
  expandable: boolean;
  isExpanded: boolean;
  onToggleExpand: (index: number) => void;
  expandContent?: (row: T) => ReactNode;
  columnCount: number;
}

function TableRow<T extends DataTableRow>({
  row,
  index,
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
}: TableRowProps<T>) {
  const handleClick = useCallback(() => {
    onRowClick?.(row);
  }, [row, onRowClick]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableRowElement>) => {
      if (e.key === 'Enter' && onRowClick) {
        e.preventDefault();
        onRowClick(row);
      }
    },
    [row, onRowClick],
  );

  const handleCheckboxChange = useCallback(() => {
    onToggleRow(index);
  }, [index, onToggleRow]);

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(index);
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
