/**
 * DataTable Pagination — Page navigation, page size selector, total count
 * Sub-component of DataTable engine
 */

import { useCallback } from 'react';

// --- Styles ---

const paginationContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--prism-data-table-cell-padding, 12px 16px)',
  borderTop: '1px solid var(--prism-data-table-row-border, var(--prism-color-border-default, #E2E8F0))',
  fontSize: 'var(--prism-typography-body-small-size, 0.875rem)',
  color: 'var(--prism-color-text-secondary, #475569)',
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
  flexWrap: 'wrap',
  gap: '8px',
};

const buttonStyle: React.CSSProperties = {
  padding: '4px 12px',
  border: '1px solid var(--prism-color-border-default, #CBD5E1)',
  borderRadius: 'var(--prism-data-table-default-radius, 4px)',
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  cursor: 'pointer',
  fontSize: 'var(--prism-typography-body-small-size, 0.875rem)',
  lineHeight: '1.5',
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  border: '1px solid var(--prism-color-border-default, #CBD5E1)',
  borderRadius: 'var(--prism-data-table-default-radius, 4px)',
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  fontSize: 'var(--prism-typography-body-small-size, 0.875rem)',
};

// --- Props ---

interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

// --- Component ---

export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayPage = page + 1; // Internal 0-indexed to display 1-indexed
  const startRow = totalCount === 0 ? 0 : page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, totalCount);

  const handleFirst = useCallback(() => { onPageChange(0); }, [onPageChange]);
  const handlePrev = useCallback(() => { onPageChange(Math.max(0, page - 1)); }, [page, onPageChange]);
  const handleNext = useCallback(() => { onPageChange(Math.min(totalPages - 1, page + 1)); }, [page, totalPages, onPageChange]);
  const handleLast = useCallback(() => { onPageChange(totalPages - 1); }, [totalPages, onPageChange]);

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onPageSizeChange(Number(e.target.value));
    },
    [onPageSizeChange],
  );

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      style={paginationContainerStyle}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>Rows per page:</span>
        <select
          value={pageSize}
          onChange={handlePageSizeChange}
          style={selectStyle}
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {totalCount > 0
          ? `${String(startRow)}-${String(endRow)} of ${String(totalCount)}`
          : '0 results'}
      </div>

      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={handleFirst}
          disabled={page === 0}
          style={page === 0 ? disabledButtonStyle : buttonStyle}
          aria-label="First page"
        >
          {'<<'}
        </button>
        <button
          onClick={handlePrev}
          disabled={page === 0}
          style={page === 0 ? disabledButtonStyle : buttonStyle}
          aria-label="Previous page"
        >
          {'<'}
        </button>
        <span
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}
          aria-current="page"
        >
          Page {displayPage} of {totalPages}
        </span>
        <button
          onClick={handleNext}
          disabled={page >= totalPages - 1}
          style={page >= totalPages - 1 ? disabledButtonStyle : buttonStyle}
          aria-label="Next page"
        >
          {'>'}
        </button>
        <button
          onClick={handleLast}
          disabled={page >= totalPages - 1}
          style={page >= totalPages - 1 ? disabledButtonStyle : buttonStyle}
          aria-label="Last page"
        >
          {'>>'}
        </button>
      </div>
    </nav>
  );
}
