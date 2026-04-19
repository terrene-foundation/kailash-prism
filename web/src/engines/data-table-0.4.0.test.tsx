/**
 * DataTable Engine — 0.4.0 feature tests.
 *
 * Covers:
 *   - G-1: TId generics propagation through DataSource / DataTableConfig /
 *          hook / component callback boundaries, with a numeric TId flow.
 *   - G-2: controlled `globalSearchValue` + `onGlobalSearchChange` round-trip.
 *   - G-4: `defaultSortComparator` sanity — ascending, descending, null/undef.
 */

import { describe, it, expect, vi } from 'vitest';
import { useState as reactUseState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  DataTable,
  defaultSortComparator,
  type ColumnDef,
  type DataTableAdapter,
  type DataTableCapabilities,
  type DataTablePage,
  type DataTableQuery,
  type DataTableRowAction,
} from './data-table.js';

// --- G-1 fixtures: numeric TId ---

interface NumericRow {
  id: number;
  title: string;
}

const numericColumns: ColumnDef<NumericRow>[] = [
  { field: 'title', header: 'Title' },
  { field: 'id', header: 'ID' },
];

function makeNumericAdapter(
  overrides: Partial<DataTableAdapter<NumericRow, number>> = {},
): DataTableAdapter<NumericRow, number> {
  return {
    getRowId: (row) => row.id, // returns number — TId = number
    capabilities: (): DataTableCapabilities => ({ serverPagination: true }),
    fetchPage: async (_q: DataTableQuery): Promise<DataTablePage<NumericRow>> => ({
      rows: [
        { id: 101, title: 'First' },
        { id: 202, title: 'Second' },
      ],
      totalCount: 2,
    }),
    ...overrides,
  };
}

// --- G-1 tests ---

describe('DataTable 0.4.0 — G-1 TId generics', () => {
  it('rowAction.onExecute receives numeric id when TId = number', async () => {
    const onExecute = vi.fn<(row: NumericRow, id: number) => void>();
    const action: DataTableRowAction<NumericRow, number> = {
      id: 'edit',
      label: 'Edit',
      onExecute,
    };
    const adapter = makeNumericAdapter({ rowActions: [action] });

    render(
      <DataTable<NumericRow, number>
        columns={numericColumns}
        data={adapter}
      />,
    );

    await waitFor(() => expect(screen.getByText('First')).toBeDefined());

    const btn = screen.getAllByRole('button', { name: 'Edit' })[0]!;
    fireEvent.click(btn);

    await waitFor(() => expect(onExecute).toHaveBeenCalledTimes(1));
    const [row, id] = onExecute.mock.calls[0]!;
    expect(row).toEqual({ id: 101, title: 'First' });
    expect(id).toBe(101); // number, NOT "101"
    expect(typeof id).toBe('number');
  });

  it('onRowClick receives typed id at callback boundary', async () => {
    const onRowClick = vi.fn<(row: NumericRow, id: number) => void>();
    const adapter = makeNumericAdapter();
    render(
      <DataTable<NumericRow, number>
        columns={numericColumns}
        data={adapter}
        onRowClick={onRowClick}
      />,
    );
    await waitFor(() => expect(screen.getByText('First')).toBeDefined());

    const firstRow = screen.getByTestId('data-table-row-0');
    fireEvent.click(firstRow);

    expect(onRowClick).toHaveBeenCalledTimes(1);
    const [row, id] = onRowClick.mock.calls[0]!;
    expect(row.id).toBe(101);
    expect(id).toBe(101);
    expect(typeof id).toBe('number');
  });

  it('rowAction.href receives typed id (numeric) for URL construction', async () => {
    const hrefBuilder = vi.fn<(row: NumericRow, id: number) => string>(
      (_row, id) => `/doc/${String(id * 10)}`,
    );
    const adapter = makeNumericAdapter({
      rowActions: [{ id: 'open', label: 'Open', href: hrefBuilder }],
    });
    render(
      <DataTable<NumericRow, number> columns={numericColumns} data={adapter} />,
    );
    await waitFor(() => expect(screen.getByText('First')).toBeDefined());

    const link = screen.getAllByRole('link', { name: 'Open' })[0]!;
    expect(link.getAttribute('href')).toBe('/doc/1010'); // 101 * 10
    // Verify the builder actually received a number
    const [, id] = hrefBuilder.mock.calls[0]!;
    expect(typeof id).toBe('number');
    expect(id).toBe(101);
  });
});

// --- G-2 tests: controlled globalSearch ---

describe('DataTable 0.4.0 — G-2 controlled globalSearch', () => {
  it('controlled mode reflects parent value and fires setter', async () => {
    const rows = [
      { id: 1, title: 'Apple' },
      { id: 2, title: 'Banana' },
      { id: 3, title: 'Cherry' },
    ];
    const cols: ColumnDef<{ id: number; title: string }>[] = [
      { field: 'title', header: 'Title' },
    ];

    function Controlled() {
      const [value, setValue] = reactUseState('');
      return (
        <>
          <div data-testid="parent-value">{value}</div>
          <DataTable
            columns={cols}
            data={rows}
            filtering={{ enabled: true, globalSearch: true }}
            globalSearchValue={value}
            onGlobalSearchChange={setValue}
            pagination={{ enabled: false }}
          />
        </>
      );
    }

    render(<Controlled />);

    const searchInput = screen.getByPlaceholderText(
      'Search all columns...',
    ) as HTMLInputElement;
    expect(searchInput.value).toBe('');

    fireEvent.change(searchInput, { target: { value: 'Ban' } });

    // Parent state updated
    expect(screen.getByTestId('parent-value').textContent).toBe('Ban');
    // Input reflects parent
    expect(searchInput.value).toBe('Ban');
    // Filtering applied using controlled value
    expect(screen.getByText('Banana')).toBeDefined();
    expect(screen.queryByText('Apple')).toBeNull();
    expect(screen.queryByText('Cherry')).toBeNull();
  });

  it('custom placeholder renders when provided', () => {
    render(
      <DataTable
        columns={[{ field: 'title', header: 'Title' }] as ColumnDef<
          { title: string }
        >[]}
        data={[{ title: 'X' }]}
        filtering={{ enabled: true, globalSearch: true }}
        globalSearchPlaceholder="Find things..."
      />,
    );
    expect(
      (screen.getByPlaceholderText('Find things...') as HTMLInputElement)
        .placeholder,
    ).toBe('Find things...');
  });

  it('one-sided controlled config logs a dev-mode warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      render(
        <DataTable
          columns={
            [{ field: 'title', header: 'Title' }] as ColumnDef<{ title: string }>[]
          }
          data={[{ title: 'X' }]}
          filtering={{ enabled: true, globalSearch: true }}
          // value without setter — should warn, fall back to uncontrolled.
          globalSearchValue="Q"
        />,
      );
      expect(warn).toHaveBeenCalled();
      const msg = warn.mock.calls[0]?.[0] as string;
      expect(msg).toContain('globalSearchValue');
      expect(msg).toContain('onGlobalSearchChange');
    } finally {
      warn.mockRestore();
    }
  });

  it('uncontrolled mode works when neither globalSearchValue nor setter provided', () => {
    render(
      <DataTable
        columns={
          [{ field: 'title', header: 'Title' }] as ColumnDef<{ title: string }>[]
        }
        data={[{ title: 'X' }]}
        filtering={{ enabled: true, globalSearch: true }}
      />,
    );
    const searchInput = screen.getByPlaceholderText(
      'Search all columns...',
    ) as HTMLInputElement;
    expect(searchInput.value).toBe('');
    fireEvent.change(searchInput, { target: { value: 'X' } });
    expect(searchInput.value).toBe('X');
  });
});

// --- G-4 tests: defaultSortComparator ---

describe('DataTable 0.4.0 — G-4 defaultSortComparator', () => {
  interface Row {
    name: string;
    age: number | null | undefined;
  }

  it('sorts ascending by string key', () => {
    const rows: Row[] = [
      { name: 'Charlie', age: 30 },
      { name: 'Alice', age: 25 },
      { name: 'Bob', age: 40 },
    ];
    const sorted = [...rows].sort((a, b) =>
      defaultSortComparator(a, b, 'name', 'asc'),
    );
    expect(sorted.map((r) => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts descending by numeric key', () => {
    const rows: Row[] = [
      { name: 'a', age: 25 },
      { name: 'b', age: 40 },
      { name: 'c', age: 30 },
    ];
    const sorted = [...rows].sort((a, b) =>
      defaultSortComparator(a, b, 'age', 'desc'),
    );
    expect(sorted.map((r) => r.age)).toEqual([40, 30, 25]);
  });

  it('null values sort FIRST ascending (PostgreSQL NULLS FIRST default)', () => {
    const rows: Row[] = [
      { name: 'b', age: 40 },
      { name: 'a', age: null },
      { name: 'c', age: 25 },
    ];
    const sorted = [...rows].sort((a, b) =>
      defaultSortComparator(a, b, 'age', 'asc'),
    );
    expect(sorted[0]?.age).toBeNull();
    expect(sorted[1]?.age).toBe(25);
    expect(sorted[2]?.age).toBe(40);
  });

  it('undefined values sort LAST descending', () => {
    const rows: Row[] = [
      { name: 'a', age: undefined },
      { name: 'b', age: 50 },
      { name: 'c', age: 10 },
    ];
    const sorted = [...rows].sort((a, b) =>
      defaultSortComparator(a, b, 'age', 'desc'),
    );
    expect(sorted[0]?.age).toBe(50);
    expect(sorted[1]?.age).toBe(10);
    expect(sorted[2]?.age).toBeUndefined();
  });

  it('both null/undefined returns 0 (stable)', () => {
    const rows: Row[] = [
      { name: 'a', age: null },
      { name: 'b', age: undefined },
    ];
    expect(defaultSortComparator(rows[0]!, rows[1]!, 'age', 'asc')).toBe(0);
  });

  it('falls back to locale-compared strings when values are non-numeric', () => {
    interface Tagged {
      tag: string;
    }
    const a: Tagged = { tag: 'apple' };
    const b: Tagged = { tag: 'banana' };
    expect(defaultSortComparator(a, b, 'tag', 'asc')).toBeLessThan(0);
    expect(defaultSortComparator(a, b, 'tag', 'desc')).toBeGreaterThan(0);
  });
});
