/**
 * DataTable States — Loading skeleton, empty state, error state
 * Sub-component of DataTable engine
 */

import type { ReactNode } from 'react';

// --- Styles ---

const stateContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '48px 24px',
  color: 'var(--prism-color-text-secondary, #475569)',
  fontSize: 'var(--prism-typography-body-size, 0.875rem)',
  textAlign: 'center',
};

const skeletonRowStyle: React.CSSProperties = {
  height: '48px',
  borderBottom: '1px solid var(--prism-data-table-row-border, var(--prism-color-border-default, #E2E8F0))',
};

const skeletonCellStyle: React.CSSProperties = {
  padding: 'var(--prism-data-table-cell-padding, 12px 16px)',
};

const skeletonBarStyle: React.CSSProperties = {
  height: '16px',
  borderRadius: '4px',
  backgroundColor: 'var(--prism-color-surface-raised, #F1F5F9)',
  animation: 'prism-skeleton-pulse 1.5s ease-in-out infinite',
};

const retryButtonStyle: React.CSSProperties = {
  marginTop: '16px',
  padding: '8px 24px',
  border: '1px solid var(--prism-color-border-default, #CBD5E1)',
  borderRadius: 'var(--prism-data-table-default-radius, 4px)',
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
  color: 'var(--prism-color-interactive-primary, #1E3A5F)',
  cursor: 'pointer',
  fontWeight: 500,
  fontSize: 'var(--prism-typography-body-size, 0.875rem)',
};

// --- Loading state ---

interface LoadingStateProps {
  columnCount: number;
  customContent?: ReactNode;
}

export function DataTableLoading({ columnCount, customContent }: LoadingStateProps) {
  if (customContent) {
    return (
      <tbody>
        <tr>
          <td colSpan={columnCount}>{customContent}</td>
        </tr>
      </tbody>
    );
  }

  // Inject keyframes for skeleton animation
  const skeletonKeyframes = `
    @keyframes prism-skeleton-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `;

  return (
    <tbody aria-busy="true">
      <tr style={{ display: 'none' }}>
        <td>
          <style>{skeletonKeyframes}</style>
        </td>
      </tr>
      {Array.from({ length: 5 }, (_, rowIndex) => (
        <tr key={rowIndex} style={skeletonRowStyle} data-testid="skeleton-row">
          {Array.from({ length: columnCount }, (_, colIndex) => (
            <td key={colIndex} style={skeletonCellStyle}>
              <div
                style={{
                  ...skeletonBarStyle,
                  width: `${String(60 + (colIndex % 3) * 15)}%`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// --- Empty state ---

interface EmptyStateProps {
  columnCount: number;
  customContent?: ReactNode;
}

export function DataTableEmpty({ columnCount, customContent }: EmptyStateProps) {
  return (
    <tbody>
      <tr>
        <td colSpan={columnCount}>
          <div style={stateContainerStyle} role="status">
            {customContent ?? (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }} aria-hidden="true">
                  {'( )'}
                </div>
                <p style={{ margin: 0, fontWeight: 500 }}>No data available</p>
                <p style={{ margin: '4px 0 0', opacity: 0.7 }}>
                  There are no records to display.
                </p>
              </>
            )}
          </div>
        </td>
      </tr>
    </tbody>
  );
}

// --- Error state ---

interface ErrorStateProps {
  columnCount: number;
  error: string;
  onRetry: (() => void) | undefined;
  customContent?: ReactNode;
}

export function DataTableError({ columnCount, error, onRetry, customContent }: ErrorStateProps) {
  return (
    <tbody>
      <tr>
        <td colSpan={columnCount}>
          <div style={stateContainerStyle} role="alert">
            {customContent ?? (
              <>
                <p style={{ margin: 0, fontWeight: 500, color: 'var(--prism-color-status-error, #DC2626)' }}>
                  Something went wrong
                </p>
                <p style={{ margin: '4px 0 0', opacity: 0.7 }}>
                  {error}
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    style={retryButtonStyle}
                    aria-label="Retry loading data"
                  >
                    Retry
                  </button>
                )}
              </>
            )}
          </div>
        </td>
      </tr>
    </tbody>
  );
}
