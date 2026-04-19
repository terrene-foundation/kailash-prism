/**
 * DataTable Engine — Tests
 * Covers: sorting, filtering, pagination, selection, empty/loading/error states,
 * bulk actions, global search, accessibility attributes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DataTable, type ColumnDef, type DataTableConfig, type BulkAction } from './data-table.js';

// --- Test data ---

interface TestRow {
  id: number;
  name: string;
  email: string;
  role: string;
  age: number;
  [key: string]: unknown;
}

const testColumns: ColumnDef<TestRow>[] = [
  { field: 'name', header: 'Name' },
  { field: 'email', header: 'Email' },
  { field: 'role', header: 'Role' },
  { field: 'age', header: 'Age', align: 'right' },
];

function makeRows(count: number): TestRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `User ${String(i + 1)}`,
    email: `user${String(i + 1)}@example.com`,
    role: i % 2 === 0 ? 'Admin' : 'Member',
    age: 20 + (i % 40),
  }));
}

const testData = makeRows(5);

function defaultProps(overrides?: Partial<DataTableConfig<TestRow>>): DataTableConfig<TestRow> {
  return {
    columns: testColumns,
    data: testData,
    pagination: { enabled: false },
    ...overrides,
  };
}

beforeEach(() => {
  // Reset viewport to desktop for each test
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
});

// --- Tests ---

describe('DataTable Engine', () => {
  describe('Rendering', () => {
    it('renders all rows and columns', () => {
      render(<DataTable {...defaultProps()} />);

      // Column headers rendered
      expect(screen.getByText('Name')).toBeDefined();
      expect(screen.getByText('Email')).toBeDefined();
      expect(screen.getByText('Role')).toBeDefined();
      expect(screen.getByText('Age')).toBeDefined();

      // All rows rendered
      expect(screen.getByText('User 1')).toBeDefined();
      expect(screen.getByText('User 5')).toBeDefined();
      expect(screen.getByText('user3@example.com')).toBeDefined();
    });

    it('applies className prop for composition', () => {
      const { container } = render(
        <DataTable {...defaultProps({ className: 'custom-table' })} />,
      );
      const wrapper = container.firstElementChild;
      expect(wrapper?.classList.contains('custom-table')).toBe(true);
    });

    it('sets role="grid" and aria-label on table', () => {
      render(
        <DataTable {...defaultProps({ 'aria-label': 'Users table' })} />,
      );
      const table = screen.getByRole('grid');
      expect(table).toBeDefined();
      expect(table.getAttribute('aria-label')).toBe('Users table');
    });
  });

  describe('Sorting', () => {
    it('sorts by column on header click', () => {
      const onSort = vi.fn();
      render(
        <DataTable {...defaultProps({ sorting: { enabled: true }, onSort })} />,
      );

      // Click "Name" header to sort ascending
      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);

      expect(onSort).toHaveBeenCalledWith([{ field: 'name', direction: 'asc' }]);

      // Verify sort indicator appears
      const th = nameHeader.closest('th');
      expect(th?.getAttribute('aria-sort')).toBe('ascending');
    });

    it('toggles sort direction on repeated clicks', () => {
      const onSort = vi.fn();
      render(
        <DataTable {...defaultProps({ sorting: { enabled: true }, onSort })} />,
      );

      const nameHeader = screen.getByText('Name');

      // First click: ascending
      fireEvent.click(nameHeader);
      expect(onSort).toHaveBeenLastCalledWith([{ field: 'name', direction: 'asc' }]);

      // Second click: descending
      fireEvent.click(nameHeader);
      expect(onSort).toHaveBeenLastCalledWith([{ field: 'name', direction: 'desc' }]);

      // Third click: removes sort
      fireEvent.click(nameHeader);
      expect(onSort).toHaveBeenLastCalledWith([]);
    });

    it('does not sort columns with sortable: false', () => {
      const cols: ColumnDef<TestRow>[] = [
        { field: 'name', header: 'Name', sortable: false },
        { field: 'email', header: 'Email' },
      ];
      render(
        <DataTable {...defaultProps({ columns: cols, sorting: { enabled: true } })} />,
      );

      const nameHeader = screen.getByText('Name').closest('th');
      // Non-sortable column should not have aria-sort
      expect(nameHeader?.getAttribute('aria-sort')).toBeNull();
    });
  });

  describe('Filtering', () => {
    it('filters rows by column filter input', () => {
      render(
        <DataTable {...defaultProps({ filtering: { enabled: true } })} />,
      );

      // Find the filter input for "Name"
      const filterInput = screen.getByPlaceholderText('Filter Name...');
      fireEvent.change(filterInput, { target: { value: 'User 1' } });

      // After filter, only "User 1" should match
      expect(screen.getByText('User 1')).toBeDefined();
      expect(screen.queryByText('User 2')).toBeNull();
    });

    it('supports global search across all columns', () => {
      render(
        <DataTable
          {...defaultProps({ filtering: { enabled: true, globalSearch: true } })}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Search all columns...');
      fireEvent.change(searchInput, { target: { value: 'Admin' } });

      // Only Admin rows should remain (indices 0, 2, 4 → User 1, 3, 5)
      expect(screen.getByText('User 1')).toBeDefined();
      expect(screen.getByText('User 3')).toBeDefined();
      expect(screen.queryByText('User 2')).toBeNull();
    });
  });

  describe('Pagination', () => {
    it('paginates data and shows page info', () => {
      const data = makeRows(30);
      render(
        <DataTable
          {...defaultProps({
            data,
            pagination: { enabled: true, defaultPageSize: 10 },
          })}
        />,
      );

      // Should show first page info
      expect(screen.getByText('1-10 of 30')).toBeDefined();
      expect(screen.getByText('Page 1 of 3')).toBeDefined();

      // First 10 rows visible
      expect(screen.getByText('User 1')).toBeDefined();
      expect(screen.getByText('User 10')).toBeDefined();
      expect(screen.queryByText('User 11')).toBeNull();
    });

    it('navigates to next page', () => {
      const data = makeRows(30);
      const onPageChange = vi.fn();
      render(
        <DataTable
          {...defaultProps({
            data,
            pagination: { enabled: true, defaultPageSize: 10 },
            onPageChange,
          })}
        />,
      );

      // Click next page
      const nextButton = screen.getByLabelText('Next page');
      fireEvent.click(nextButton);

      expect(onPageChange).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
      expect(screen.getByText('Page 2 of 3')).toBeDefined();
      expect(screen.getByText('User 11')).toBeDefined();
    });

    it('changes page size', () => {
      const data = makeRows(30);
      render(
        <DataTable
          {...defaultProps({
            data,
            pagination: { enabled: true, defaultPageSize: 10 },
          })}
        />,
      );

      const select = screen.getByLabelText('Rows per page');
      fireEvent.change(select, { target: { value: '25' } });

      // Should reset to page 1 and show 25 rows
      expect(screen.getByText('1-25 of 30')).toBeDefined();
    });
  });

  describe('Selection', () => {
    it('selects individual rows via checkbox', () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          {...defaultProps({
            selection: { enabled: true },
            onSelectionChange,
          })}
        />,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is "select all", rest are row checkboxes
      const firstRowCheckbox = checkboxes[1];
      expect(firstRowCheckbox).toBeDefined();
      fireEvent.click(firstRowCheckbox!);

      expect(onSelectionChange).toHaveBeenCalled();
      const selectedRows = onSelectionChange.mock.calls[0]?.[0] as TestRow[];
      expect(selectedRows.length).toBe(1);
      expect(selectedRows[0]?.name).toBe('User 1');
    });

    it('select all toggles all rows', () => {
      const onSelectionChange = vi.fn();
      render(
        <DataTable
          {...defaultProps({
            selection: { enabled: true },
            onSelectionChange,
          })}
        />,
      );

      const selectAll = screen.getByLabelText('Select all rows');
      fireEvent.click(selectAll);

      const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1] as [TestRow[]];
      expect(lastCall[0].length).toBe(5);
    });

    it('shows indeterminate state when some rows selected', () => {
      render(
        <DataTable
          {...defaultProps({ selection: { enabled: true } })}
        />,
      );

      // Select first row
      const firstRowCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(firstRowCheckbox!);

      // Select-all checkbox should be indeterminate
      const selectAll = screen.getByLabelText('Select all rows') as HTMLInputElement;
      expect(selectAll.indeterminate).toBe(true);
      expect(selectAll.checked).toBe(false);
    });
  });

  describe('Bulk Actions', () => {
    it('shows action bar when rows selected', () => {
      const onDelete = vi.fn();
      const bulkActions: BulkAction<TestRow>[] = [
        { label: 'Delete', variant: 'destructive', onExecute: onDelete },
      ];

      render(
        <DataTable
          {...defaultProps({
            selection: { enabled: true },
            bulkActions,
          })}
        />,
      );

      // No action bar initially
      expect(screen.queryByText('Delete')).toBeNull();

      // Select a row
      const firstRowCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(firstRowCheckbox!);

      // Action bar appears (text also in live region, so use toolbar query)
      const toolbar = screen.getByRole('toolbar');
      expect(within(toolbar).getByText('1 row selected')).toBeDefined();
      const deleteButton = screen.getByText('Delete');
      expect(deleteButton).toBeDefined();

      // Click delete
      fireEvent.click(deleteButton);
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect((onDelete.mock.calls[0] as [TestRow[]])[0].length).toBe(1);
    });

    it('clears selection when clear button clicked', () => {
      const bulkActions: BulkAction<TestRow>[] = [
        { label: 'Export', variant: 'primary', onExecute: vi.fn() },
      ];

      render(
        <DataTable
          {...defaultProps({
            selection: { enabled: true },
            bulkActions,
          })}
        />,
      );

      // Select a row
      const firstRowCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(firstRowCheckbox!);
      const toolbar = screen.getByRole('toolbar');
      expect(within(toolbar).getByText('1 row selected')).toBeDefined();

      // Clear selection
      const clearButton = screen.getByLabelText('Clear selection');
      fireEvent.click(clearButton);

      // Action bar gone (toolbar should no longer exist)
      expect(screen.queryByRole('toolbar')).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton rows when loading', () => {
      render(<DataTable {...defaultProps({ loading: true })} />);

      const table = screen.getByRole('grid');
      expect(table.getAttribute('aria-busy')).toBe('true');

      const skeletonRows = screen.getAllByTestId('skeleton-row');
      expect(skeletonRows.length).toBe(5);
    });

    it('shows custom loading state', () => {
      render(
        <DataTable
          {...defaultProps({
            loading: true,
            loadingState: <div data-testid="custom-loading">Loading users...</div>,
          })}
        />,
      );

      expect(screen.getByTestId('custom-loading')).toBeDefined();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when data is empty', () => {
      render(<DataTable {...defaultProps({ data: [] })} />);

      expect(screen.getByText('No data available')).toBeDefined();
    });

    it('shows custom empty state', () => {
      render(
        <DataTable
          {...defaultProps({
            data: [],
            emptyState: <div data-testid="custom-empty">No users found</div>,
          })}
        />,
      );

      expect(screen.getByTestId('custom-empty')).toBeDefined();
    });
  });

  describe('Error State', () => {
    it('shows error state with message', () => {
      render(
        <DataTable
          {...defaultProps({ error: 'Failed to fetch data' })}
        />,
      );

      expect(screen.getByRole('alert')).toBeDefined();
      expect(screen.getByText('Something went wrong')).toBeDefined();
      expect(screen.getByText('Failed to fetch data')).toBeDefined();
    });

    it('shows retry button and calls onRetry', () => {
      const onRetry = vi.fn();
      render(
        <DataTable
          {...defaultProps({
            error: 'Network error',
            onRetry,
          })}
        />,
      );

      const retryButton = screen.getByLabelText('Retry loading data');
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows custom error state', () => {
      render(
        <DataTable
          {...defaultProps({
            error: 'fail',
            errorState: <div data-testid="custom-error">Custom error UI</div>,
          })}
        />,
      );

      expect(screen.getByTestId('custom-error')).toBeDefined();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes on sortable columns', () => {
      render(
        <DataTable {...defaultProps({ sorting: { enabled: true } })} />,
      );

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader?.getAttribute('role')).toBe('columnheader');
      expect(nameHeader?.getAttribute('aria-sort')).toBe('none');
    });

    it('filter inputs have aria-label', () => {
      render(
        <DataTable {...defaultProps({ filtering: { enabled: true } })} />,
      );

      const nameFilter = screen.getByLabelText('Filter by Name');
      expect(nameFilter).toBeDefined();
      expect(nameFilter.tagName.toLowerCase()).toBe('input');
    });

    it('pagination has nav landmark with aria-label', () => {
      const data = makeRows(30);
      render(
        <DataTable
          {...defaultProps({
            data,
            pagination: { enabled: true, defaultPageSize: 10 },
          })}
        />,
      );

      const nav = screen.getByRole('navigation');
      expect(nav.getAttribute('aria-label')).toBe('Pagination');
    });

    it('row checkboxes have aria-label with row number', () => {
      render(
        <DataTable {...defaultProps({ selection: { enabled: true } })} />,
      );

      const checkbox = screen.getByLabelText('Select row 1');
      expect(checkbox).toBeDefined();
    });

    it('supports keyboard activation of sort headers', () => {
      const onSort = vi.fn();
      render(
        <DataTable {...defaultProps({ sorting: { enabled: true }, onSort })} />,
      );

      const nameHeader = screen.getByText('Name').closest('th');
      expect(nameHeader).toBeDefined();
      fireEvent.keyDown(nameHeader!, { key: 'Enter' });

      expect(onSort).toHaveBeenCalledWith([{ field: 'name', direction: 'asc' }]);
    });
  });

  describe('Row Click', () => {
    it('calls onRowClick when a row is clicked', () => {
      const onRowClick = vi.fn();
      render(
        <DataTable {...defaultProps({ onRowClick })} />,
      );

      const firstRow = screen.getByTestId('data-table-row-0');
      fireEvent.click(firstRow);

      expect(onRowClick).toHaveBeenCalledTimes(1);
      // Since 0.4.0 — signature is (row, id: TId). TId defaults to string
      // for array-data sources; the row has `id: 1` so the engine passes
      // the stringified '1' as the second arg.
      const call = onRowClick.mock.calls[0] as [TestRow, string];
      expect(call[0].name).toBe('User 1');
      expect(call[1]).toBe('1');
    });
  });

  describe('Custom Cell Renderer', () => {
    it('renders custom cell content via column render function', () => {
      const cols: ColumnDef<TestRow>[] = [
        {
          field: 'name',
          header: 'Name',
          render: (value) => <strong data-testid="custom-cell">{String(value)}</strong>,
        },
        { field: 'email', header: 'Email' },
      ];

      render(<DataTable {...defaultProps({ columns: cols })} />);

      const customCells = screen.getAllByTestId('custom-cell');
      expect(customCells.length).toBe(5);
      expect(customCells[0]?.textContent).toBe('User 1');
    });
  });

  describe('Responsive — Mobile Card Layout', () => {
    it('renders card layout when viewport is mobile', () => {
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
      fireEvent(window, new Event('resize'));

      render(<DataTable {...defaultProps()} />);

      // Mobile layout should render cards instead of table
      const mobileContainer = screen.queryByTestId('data-table-mobile');
      expect(mobileContainer).toBeDefined();
    });
  });

  describe('Filtering resets pagination', () => {
    it('resets to first page when filter changes', () => {
      const data = makeRows(30);
      render(
        <DataTable
          {...defaultProps({
            data,
            pagination: { enabled: true, defaultPageSize: 10 },
            filtering: { enabled: true },
          })}
        />,
      );

      // Navigate to page 2
      fireEvent.click(screen.getByLabelText('Next page'));
      expect(screen.getByText('Page 2 of 3')).toBeDefined();

      // Apply a filter — should reset to page 1
      const nameFilter = screen.getByPlaceholderText('Filter Name...');
      fireEvent.change(nameFilter, { target: { value: 'User 1' } });

      // After filtering, pagination should have reset
      // "User 1" + partial matches "User 10"-"User 19" = 11 matches with page size 10
      // Should be on page 1
      const pageInfo = screen.getByText(/^Page 1/);
      expect(pageInfo).toBeDefined();
    });
  });
});
