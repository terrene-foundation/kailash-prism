/**
 * DataTable Header — Column headers with sort indicators and filter inputs
 * Sub-component of DataTable engine
 */

import { useCallback, useState, type KeyboardEvent } from 'react';
import type { ColumnDef, DataTableRow, SortState } from './types.js';

// --- Styles (CSS custom properties from Theme engine) ---

const headerCellStyle: React.CSSProperties = {
  padding: 'var(--prism-data-table-cell-padding, 12px 16px)',
  backgroundColor: 'var(--prism-data-table-header-bg, var(--prism-color-surface-raised, #F1F5F9))',
  color: 'var(--prism-data-table-header-text, var(--prism-color-text-primary, #0F172A))',
  borderBottom: '2px solid var(--prism-data-table-header-border, var(--prism-color-border-default, #E2E8F0))',
  fontWeight: 600,
  fontSize: 'var(--prism-typography-label-size, 0.875rem)',
  textAlign: 'left',
  userSelect: 'none',
  whiteSpace: 'nowrap',
  position: 'relative',
};

const sortIndicatorStyle: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: '4px',
  fontSize: '0.75rem',
};

const filterInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  marginTop: '4px',
  border: '1px solid var(--prism-color-border-default, #CBD5E1)',
  borderRadius: 'var(--prism-data-table-default-radius, 4px)',
  fontSize: 'var(--prism-typography-body-small-size, 0.75rem)',
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

// --- Props ---

interface DataTableHeaderProps<T extends DataTableRow> {
  columns: ColumnDef<T>[];
  sorts: SortState[];
  filters: Record<string, string>;
  sortingEnabled: boolean;
  filteringEnabled: boolean;
  selectionEnabled: boolean;
  allSelected: boolean;
  someSelected: boolean;
  onSort: (field: string) => void;
  onMultiSort: (field: string) => void;
  onFilterChange: (field: string, value: string) => void;
  onSelectAll: () => void;
}

// --- Component ---

export function DataTableHeader<T extends DataTableRow>({
  columns,
  sorts,
  filters,
  sortingEnabled,
  filteringEnabled,
  selectionEnabled,
  allSelected,
  someSelected,
  onSort,
  onMultiSort,
  onFilterChange,
  onSelectAll,
}: DataTableHeaderProps<T>) {
  return (
    <thead>
      <tr role="row">
        {selectionEnabled && (
          <th
            style={{ ...headerCellStyle, width: '48px', textAlign: 'center' }}
            role="columnheader"
          >
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected && !allSelected;
              }}
              onChange={onSelectAll}
              aria-label="Select all rows"
            />
          </th>
        )}
        {columns.map((col) => {
          const sortState = sorts.find((s) => s.field === col.field);
          const isSortable = sortingEnabled && col.sortable !== false;
          const ariaSort = sortState
            ? sortState.direction === 'asc'
              ? 'ascending'
              : 'descending'
            : 'none';

          return (
            <ColumnHeader
              key={col.field}
              column={col}
              sortState={sortState}
              isSortable={isSortable}
              ariaSort={ariaSort}
              filterValue={filters[col.field] ?? ''}
              filteringEnabled={filteringEnabled && col.filterable !== false}
              onSort={onSort}
              onMultiSort={onMultiSort}
              onFilterChange={onFilterChange}
            />
          );
        })}
      </tr>
    </thead>
  );
}

// --- Column header sub-component ---

interface ColumnHeaderProps<T extends DataTableRow> {
  column: ColumnDef<T>;
  sortState: SortState | undefined;
  isSortable: boolean;
  ariaSort: 'ascending' | 'descending' | 'none';
  filterValue: string;
  filteringEnabled: boolean;
  onSort: (field: string) => void;
  onMultiSort: (field: string) => void;
  onFilterChange: (field: string, value: string) => void;
}

function ColumnHeader<T extends DataTableRow>({
  column,
  sortState,
  isSortable,
  ariaSort,
  filterValue,
  filteringEnabled,
  onSort,
  onMultiSort,
  onFilterChange,
}: ColumnHeaderProps<T>) {
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSortable) return;
      if (e.shiftKey) {
        onMultiSort(column.field);
      } else {
        onSort(column.field);
      }
      const nextDir = sortState?.direction === 'asc' ? 'descending' : 'ascending';
      setLiveAnnouncement(`Sorted by ${column.header} ${nextDir}`);
    },
    [isSortable, column.field, column.header, sortState, onSort, onMultiSort],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isSortable) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (e.shiftKey) {
          onMultiSort(column.field);
        } else {
          onSort(column.field);
        }
        const nextDir = sortState?.direction === 'asc' ? 'descending' : 'ascending';
        setLiveAnnouncement(`Sorted by ${column.header} ${nextDir}`);
      }
    },
    [isSortable, column.field, column.header, sortState, onSort, onMultiSort],
  );

  const widthStyle: React.CSSProperties =
    column.width === 'auto'
      ? {}
      : column.width != null
        ? { width: `${String(column.width)}px`, minWidth: `${String(column.minWidth ?? 80)}px` }
        : { minWidth: `${String(column.minWidth ?? 80)}px` };

  return (
    <th
      role="columnheader"
      aria-sort={isSortable ? ariaSort : undefined}
      style={{
        ...headerCellStyle,
        ...widthStyle,
        textAlign: column.align ?? 'left',
        cursor: isSortable ? 'pointer' : 'default',
      }}
      tabIndex={isSortable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start' }}>
        <span>{column.header}</span>
        {isSortable && sortState && (
          <span style={sortIndicatorStyle} aria-hidden="true">
            {sortState.direction === 'asc' ? '\u25B2' : '\u25BC'}
          </span>
        )}
      </div>
      {filteringEnabled && (
        <input
          type="text"
          value={filterValue}
          onChange={(e) => { onFilterChange(column.field, e.target.value); }}
          onClick={(e) => { e.stopPropagation(); }}
          onKeyDown={(e) => { e.stopPropagation(); }}
          placeholder={`Filter ${column.header}...`}
          aria-label={`Filter by ${column.header}`}
          style={filterInputStyle}
        />
      )}
      {/* Live region for sort announcements */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}
      >
        {liveAnnouncement}
      </span>
    </th>
  );
}
