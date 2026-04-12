/**
 * DataTable Bulk Actions — Action bar displayed when rows are selected
 * Sub-component of DataTable engine
 */

import { useCallback } from 'react';
import type { BulkAction, DataTableRow } from './types.js';

// --- Styles ---

const barStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 16px',
  backgroundColor: 'var(--prism-color-interactive-primary, #1E3A5F)',
  color: 'var(--prism-color-interactive-primary-text, #FFFFFF)',
  borderRadius: 'var(--prism-data-table-default-radius, 4px)',
  fontSize: 'var(--prism-typography-body-small-size, 0.875rem)',
  margin: '0 0 8px 0',
};

const actionButtonBase: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 'var(--prism-data-table-default-radius, 4px)',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 'var(--prism-typography-body-small-size, 0.875rem)',
  border: 'none',
  lineHeight: '1.5',
};

function getActionStyle(variant: BulkAction<DataTableRow>['variant']): React.CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        ...actionButtonBase,
        backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
        color: 'var(--prism-color-interactive-primary, #1E3A5F)',
      };
    case 'destructive':
      return {
        ...actionButtonBase,
        backgroundColor: 'var(--prism-color-status-error, #DC2626)',
        color: '#FFFFFF',
      };
    case 'ghost':
      return {
        ...actionButtonBase,
        backgroundColor: 'transparent',
        color: 'var(--prism-color-interactive-primary-text, #FFFFFF)',
        border: '1px solid currentColor',
      };
  }
}

// --- Props ---

interface DataTableBulkActionsProps<T extends DataTableRow> {
  selectedCount: number;
  selectedRows: T[];
  actions: BulkAction<T>[];
  onClearSelection: () => void;
}

// --- Component ---

export function DataTableBulkActions<T extends DataTableRow>({
  selectedCount,
  selectedRows,
  actions,
  onClearSelection,
}: DataTableBulkActionsProps<T>) {
  if (selectedCount === 0) return null;

  return (
    <div style={barStyle} role="toolbar" aria-label="Bulk actions">
      <span>
        {selectedCount} row{selectedCount !== 1 ? 's' : ''} selected
      </span>
      {actions.map((action) => (
        <BulkActionButton
          key={action.label}
          action={action}
          selectedRows={selectedRows}
        />
      ))}
      <button
        onClick={onClearSelection}
        style={{
          ...actionButtonBase,
          backgroundColor: 'transparent',
          color: 'var(--prism-color-interactive-primary-text, #FFFFFF)',
          marginLeft: 'auto',
        }}
        aria-label="Clear selection"
      >
        Clear
      </button>
    </div>
  );
}

// --- BulkActionButton ---

interface BulkActionButtonProps<T extends DataTableRow> {
  action: BulkAction<T>;
  selectedRows: T[];
}

function BulkActionButton<T extends DataTableRow>({
  action,
  selectedRows,
}: BulkActionButtonProps<T>) {
  const handleClick = useCallback(() => {
    action.onExecute(selectedRows);
  }, [action, selectedRows]);

  return (
    <button
      onClick={handleClick}
      style={getActionStyle(action.variant)}
    >
      {action.label}
    </button>
  );
}
