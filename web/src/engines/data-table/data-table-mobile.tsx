/**
 * DataTable Mobile Card Layout — Responsive card view for < 768px
 * Sub-component of DataTable engine
 *
 * Each row renders as a card with:
 * - First column as title
 * - Second column as subtitle
 * - Up to 3 additional fields as label:value pairs
 * Per spec: docs/specs/05-engine-specifications.md § 5.1 Responsive Contract
 */

import { useCallback } from 'react';
import type { ColumnDef, DataTableRow } from './types.js';

// --- Styles ---

const cardStyle: React.CSSProperties = {
  padding: '16px',
  backgroundColor: 'var(--prism-data-table-row-bg, var(--prism-color-surface-page, #FFFFFF))',
  borderRadius: 'var(--prism-data-table-default-radius, 8px)',
  border: '1px solid var(--prism-data-table-row-border, var(--prism-color-border-default, #E2E8F0))',
  marginBottom: '8px',
};

const selectedCardStyle: React.CSSProperties = {
  ...cardStyle,
  backgroundColor: 'var(--prism-data-table-row-selected-bg, var(--prism-color-interactive-primary-subtle, #EFF6FF))',
  borderColor: 'var(--prism-color-interactive-primary, #1E3A5F)',
};

const cardTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 'var(--prism-typography-body-size, 0.875rem)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  margin: 0,
};

const cardSubtitleStyle: React.CSSProperties = {
  fontSize: 'var(--prism-typography-body-small-size, 0.75rem)',
  color: 'var(--prism-color-text-secondary, #475569)',
  margin: '2px 0 0',
};

const cardFieldStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: 'var(--prism-typography-body-small-size, 0.75rem)',
  padding: '4px 0',
  borderTop: '1px solid var(--prism-data-table-row-border, var(--prism-color-border-default, #E2E8F0))',
};

const cardFieldLabelStyle: React.CSSProperties = {
  color: 'var(--prism-color-text-secondary, #475569)',
  fontWeight: 500,
};

const cardFieldValueStyle: React.CSSProperties = {
  color: 'var(--prism-color-text-primary, #0F172A)',
};

// --- Props ---

interface DataTableMobileProps<T extends DataTableRow> {
  rows: T[];
  columns: ColumnDef<T>[];
  selectionEnabled: boolean;
  selectedIds: Set<string>;
  onRowClick: ((row: T) => void) | undefined;
  onToggleRow: (index: number) => void;
  getRowId: (row: T, index: number) => string;
}

// --- Component ---

export function DataTableMobile<T extends DataTableRow>({
  rows,
  columns,
  selectionEnabled,
  selectedIds,
  onRowClick,
  onToggleRow,
  getRowId,
}: DataTableMobileProps<T>) {
  const titleCol = columns[0];
  const subtitleCol = columns[1];
  const detailCols = columns.slice(2, 5); // Up to 3 additional fields

  return (
    <div role="list" data-testid="data-table-mobile">
      {rows.map((row, index) => {
        const id = getRowId(row, index);
        const isSelected = selectedIds.has(id);
        return (
          <MobileCard
            key={id}
            row={row}
            index={index}
            titleCol={titleCol}
            subtitleCol={subtitleCol}
            detailCols={detailCols}
            selectionEnabled={selectionEnabled}
            isSelected={isSelected}
            onRowClick={onRowClick}
            onToggleRow={onToggleRow}
          />
        );
      })}
    </div>
  );
}

// --- Card ---

interface MobileCardProps<T extends DataTableRow> {
  row: T;
  index: number;
  titleCol: ColumnDef<T> | undefined;
  subtitleCol: ColumnDef<T> | undefined;
  detailCols: ColumnDef<T>[];
  selectionEnabled: boolean;
  isSelected: boolean;
  onRowClick: ((row: T) => void) | undefined;
  onToggleRow: (index: number) => void;
}

function MobileCard<T extends DataTableRow>({
  row,
  index,
  titleCol,
  subtitleCol,
  detailCols,
  selectionEnabled,
  isSelected,
  onRowClick,
  onToggleRow,
}: MobileCardProps<T>) {
  const handleClick = useCallback(() => {
    onRowClick?.(row);
  }, [row, onRowClick]);

  const handleCheckbox = useCallback(() => {
    onToggleRow(index);
  }, [index, onToggleRow]);

  return (
    <div
      role="listitem"
      style={isSelected ? selectedCardStyle : cardStyle}
      onClick={onRowClick ? handleClick : undefined}
      data-testid={`data-table-card-${String(index)}`}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {selectionEnabled && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckbox}
            onClick={(e) => { e.stopPropagation(); }}
            aria-label={`Select row ${String(index + 1)}`}
            style={{ marginTop: '2px' }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {titleCol && (
            <p style={cardTitleStyle}>
              {titleCol.render
                ? titleCol.render(row[titleCol.field], row)
                : String(row[titleCol.field] ?? '')}
            </p>
          )}
          {subtitleCol && (
            <p style={cardSubtitleStyle}>
              {subtitleCol.render
                ? subtitleCol.render(row[subtitleCol.field], row)
                : String(row[subtitleCol.field] ?? '')}
            </p>
          )}
        </div>
      </div>
      {detailCols.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {detailCols.map((col) => (
            <div key={col.field} style={cardFieldStyle}>
              <span style={cardFieldLabelStyle}>{col.header}</span>
              <span style={cardFieldValueStyle}>
                {col.render
                  ? col.render(row[col.field], row)
                  : String(row[col.field] ?? '')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
