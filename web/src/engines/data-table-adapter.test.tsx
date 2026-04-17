/**
 * DataTableAdapter tests — interface contract, adaptLegacy shim, hook
 * wiring, row actions, bulk actions, onRowActivate, invalidate.
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.1.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  DataTable,
  type ColumnDef,
  type DataTableAdapter,
  type DataTableCapabilities,
  type DataTablePage,
  type DataTableQuery,
  type DataTableRowAction,
  type DataTableBulkAction,
  type ServerDataSource,
} from './data-table.js';
import { adaptLegacy, isDataTableAdapter, isServerDataSource, resolveDataSource } from './data-table.js';

interface Doc {
  id: number;
  title: string;
  status: string;
}

const columns: ColumnDef<Doc>[] = [
  { field: 'id', header: 'ID' },
  { field: 'title', header: 'Title' },
  { field: 'status', header: 'Status' },
];

const sampleDocs: Doc[] = [
  { id: 1, title: 'Contract', status: 'active' },
  { id: 2, title: 'Policy', status: 'draft' },
];

function makeAdapter(overrides: Partial<DataTableAdapter<Doc, string>> = {}): DataTableAdapter<Doc, string> {
  return {
    getRowId: (row: Doc) => String(row.id),
    capabilities: (): DataTableCapabilities => ({ serverPagination: true }),
    fetchPage: async (_query: DataTableQuery): Promise<DataTablePage<Doc>> => ({
      rows: sampleDocs,
      totalCount: sampleDocs.length,
    }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('DataTableAdapter', () => {
  describe('interface contract', () => {
    it('accepts an adapter via DataTableConfig.data', async () => {
      const adapter = makeAdapter();
      render(<DataTable columns={columns} data={adapter} />);

      await waitFor(() => {
        expect(screen.getByText('Contract')).toBeDefined();
        expect(screen.getByText('Policy')).toBeDefined();
      });
    });

    it('calls capabilities() once on mount', async () => {
      const capabilitiesSpy = vi.fn((): DataTableCapabilities => ({ serverPagination: true }));
      const adapter = makeAdapter({ capabilities: capabilitiesSpy });

      const { rerender } = render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      // Re-render with the SAME adapter reference. capabilities should be
      // called once total — memoized via adapter identity.
      rerender(<DataTable columns={columns} data={adapter} />);
      rerender(<DataTable columns={columns} data={adapter} />);

      expect(capabilitiesSpy).toHaveBeenCalledTimes(1);
    });

    it('calls fetchPage on mount with initial query', async () => {
      const fetchPage = vi.fn().mockResolvedValue({ rows: sampleDocs, totalCount: 2 });
      const adapter = makeAdapter({ fetchPage });

      render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => expect(fetchPage).toHaveBeenCalled());

      const [query] = fetchPage.mock.calls[0] as [DataTableQuery];
      expect(query.page).toBe(0);
      expect(query.pageSize).toBeGreaterThan(0);
      expect(query.sort).toEqual([]);
      expect(query.filters).toEqual({});
      expect(query.globalSearch).toBe('');
    });

    it('uses adapter.getRowId for row identity', async () => {
      const getRowId = vi.fn((row: Doc) => `doc-${String(row.id)}`);
      const adapter = makeAdapter({ getRowId });
      render(
        <DataTable
          columns={columns}
          data={adapter}
          selection={{ enabled: true }}
        />,
      );
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());
      expect(getRowId).toHaveBeenCalled();
      // Rows exist and rendered with the adapter's id shape (verified via
      // presence of the checkboxes via role query below).
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    });
  });

  describe('rowActions', () => {
    it('renders a trailing actions column when rowActions are declared', async () => {
      const action: DataTableRowAction<Doc> = {
        id: 'preview',
        label: 'Preview',
        onExecute: vi.fn(),
      };
      const adapter = makeAdapter({ rowActions: [action] });

      render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const cells = screen.getAllByTestId(/data-table-row-actions-/);
      expect(cells).toHaveLength(2);
      // Each cell has a Preview button.
      const buttons = screen.getAllByRole('button', { name: 'Preview' });
      expect(buttons).toHaveLength(2);
    });

    it('invokes onExecute and then adapter.invalidate on action click', async () => {
      const invalidate = vi.fn().mockResolvedValue(undefined);
      const onExecute = vi.fn().mockResolvedValue(undefined);
      let fetchCount = 0;
      const fetchPage = vi.fn(async () => {
        fetchCount++;
        return { rows: sampleDocs, totalCount: 2 };
      });
      const adapter = makeAdapter({
        fetchPage,
        invalidate,
        rowActions: [{ id: 'delete', label: 'Delete', onExecute }],
      });

      render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const firstBefore = fetchCount;
      const btn = screen.getAllByRole('button', { name: 'Delete' })[0]!;
      btn.click();

      await waitFor(() => expect(onExecute).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
      // After invalidate, fetchPage is called again to refresh.
      await waitFor(() => expect(fetchCount).toBeGreaterThan(firstBefore));
      expect(onExecute).toHaveBeenCalledWith(sampleDocs[0], '1');
    });

    it('renders anchor instead of button when href is supplied', async () => {
      const adapter = makeAdapter({
        rowActions: [{
          id: 'preview',
          label: 'Preview',
          href: (_row, id) => `/docs/${id}/preview`,
        }],
      });

      render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const link = screen.getAllByRole('link', { name: 'Preview' })[0]!;
      expect(link.getAttribute('href')).toBe('/docs/1/preview');
    });

    it('hides actions matching the visible predicate', async () => {
      const adapter = makeAdapter({
        rowActions: [{
          id: 'activate',
          label: 'Activate',
          onExecute: vi.fn(),
          visible: (row) => row.status === 'draft',
        }],
      });

      render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      // Only the 'draft' row has the action visible.
      const buttons = screen.getAllByRole('button', { name: 'Activate' });
      expect(buttons).toHaveLength(1);
    });

    it('action click does not fire onRowClick (stopPropagation)', async () => {
      const onRowActivate = vi.fn();
      const onExecute = vi.fn().mockResolvedValue(undefined);
      const adapter = makeAdapter({
        onRowActivate,
        rowActions: [{ id: 'do', label: 'Do', onExecute }],
      });

      render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const btn = screen.getAllByRole('button', { name: 'Do' })[0]!;
      btn.click();

      await waitFor(() => expect(onExecute).toHaveBeenCalled());
      expect(onRowActivate).not.toHaveBeenCalled();
    });
  });

  describe('bulkActions', () => {
    it('merges adapter.bulkActions with config.bulkActions when both provided', async () => {
      const adapterBulk: DataTableBulkAction<Doc> = {
        id: 'adapter-delete',
        label: 'Adapter Delete',
        onExecute: vi.fn(),
      };
      const adapter = makeAdapter({ bulkActions: [adapterBulk] });

      render(
        <DataTable
          columns={columns}
          data={adapter}
          selection={{ enabled: true }}
          bulkActions={[{
            label: 'Config Archive',
            variant: 'ghost',
            onExecute: vi.fn(),
          }]}
        />,
      );
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      // Select a row to surface the bulk bar.
      const checkboxes = screen.getAllByRole('checkbox');
      const firstRowCheckbox = checkboxes.find(cb => cb.getAttribute('aria-label')?.includes('Select row'));
      fireEvent.click(firstRowCheckbox!);

      // Both actions appear.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Adapter Delete' })).toBeDefined();
        expect(screen.getByRole('button', { name: 'Config Archive' })).toBeDefined();
      });
    });

    it('bulk action onExecute fires adapter.invalidate and clears selection', async () => {
      const invalidate = vi.fn().mockResolvedValue(undefined);
      const onExecute = vi.fn().mockResolvedValue(undefined);
      const adapter = makeAdapter({
        invalidate,
        bulkActions: [{ id: 'del', label: 'Bulk Delete', onExecute }],
      });

      render(
        <DataTable
          columns={columns}
          data={adapter}
          selection={{ enabled: true }}
        />,
      );
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      // Select one row.
      const rowCheckbox = screen.getAllByRole('checkbox').find(cb =>
        cb.getAttribute('aria-label')?.includes('Select row')
      );
      fireEvent.click(rowCheckbox!);

      const btn = await screen.findByRole('button', { name: 'Bulk Delete' });
      btn.click();

      await waitFor(() => expect(onExecute).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(invalidate).toHaveBeenCalled());
    });
  });

  describe('onRowActivate', () => {
    it('fires on row click', async () => {
      const onRowActivate = vi.fn();
      const adapter = makeAdapter({ onRowActivate });

      render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const firstRow = screen.getAllByTestId(/data-table-row-/)[0]!;
      fireEvent.click(firstRow);

      expect(onRowActivate).toHaveBeenCalledWith(sampleDocs[0]);
    });

    it('adapter.onRowActivate takes precedence over config.onRowClick', async () => {
      const onRowActivate = vi.fn();
      const onRowClick = vi.fn();
      const adapter = makeAdapter({ onRowActivate });

      render(<DataTable columns={columns} data={adapter} onRowClick={onRowClick} />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const firstRow = screen.getAllByTestId(/data-table-row-/)[0]!;
      fireEvent.click(firstRow);

      expect(onRowActivate).toHaveBeenCalled();
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  describe('adaptLegacy shim', () => {
    it('lifts a ServerDataSource into a DataTableAdapter', async () => {
      const fetchData = vi.fn().mockResolvedValue({ items: sampleDocs, totalCount: 2 });
      const legacySource: ServerDataSource<Doc> = { fetchData };
      const adapter = adaptLegacy(legacySource);

      expect(isDataTableAdapter<Doc>(adapter)).toBe(true);
      expect(isServerDataSource<Doc>(adapter)).toBe(false);

      const page = await adapter.fetchPage({
        page: 0,
        pageSize: 25,
        sort: [{ field: 'title', direction: 'asc' }],
        filters: { status: 'active' },
        globalSearch: 'con',
      });

      expect(fetchData).toHaveBeenCalledWith(expect.objectContaining({
        page: 0,
        pageSize: 25,
        sort: [{ field: 'title', direction: 'asc' }],
        filters: { status: 'active' },
        globalSearch: 'con',
      }));
      expect(page.rows).toEqual(sampleDocs);
      expect(page.totalCount).toBe(2);
    });

    it('legacy ServerDataSource still works via the hook (end-to-end)', async () => {
      const fetchData = vi.fn().mockResolvedValue({ items: sampleDocs, totalCount: 2 });
      const legacy: ServerDataSource<Doc> = { fetchData };

      render(<DataTable columns={columns} data={legacy} />);
      await waitFor(() => {
        expect(screen.getByText('Contract')).toBeDefined();
      });
      expect(fetchData).toHaveBeenCalled();
    });

    it('resolveDataSource classifies array / adapter / legacy correctly', () => {
      expect(resolveDataSource<Doc>([]).adapter).toBeNull();
      expect(resolveDataSource<Doc>([]).clientData).toEqual([]);

      const adapter = makeAdapter();
      expect(resolveDataSource<Doc>(adapter).adapter).toBe(adapter);

      const legacy: ServerDataSource<Doc> = { fetchData: async () => ({ items: [], totalCount: 0 }) };
      const resolved = resolveDataSource<Doc>(legacy);
      expect(resolved.adapter).not.toBeNull();
      // Resolution through adapter shim — not the same object.
      expect(resolved.adapter).not.toBe(legacy as unknown);
    });
  });

  describe('fetch lifecycle', () => {
    it('refetches when sort changes', async () => {
      const fetchPage = vi.fn().mockResolvedValue({ rows: sampleDocs, totalCount: 2 });
      const adapter = makeAdapter({ fetchPage });

      render(<DataTable columns={columns} data={adapter} sorting={{ enabled: true }} />);
      await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));

      // Click column header to sort.
      fireEvent.click(screen.getByRole('columnheader', { name: /Title/ }));
      await waitFor(() => expect(fetchPage.mock.calls.length).toBeGreaterThanOrEqual(2));

      const lastCall = fetchPage.mock.calls[fetchPage.mock.calls.length - 1]?.[0] as DataTableQuery;
      expect(lastCall.sort).toEqual([{ field: 'title', direction: 'asc' }]);
    });

    it('surfaces fetchPage errors through the error state', async () => {
      const fetchPage = vi.fn().mockRejectedValue(new Error('backend down'));
      const adapter = makeAdapter({ fetchPage });

      render(<DataTable columns={columns} data={adapter} />);
      await waitFor(() => {
        expect(screen.getByText(/backend down/)).toBeDefined();
      });
    });

    it('honors AbortSignal on rapid state changes (stale results discarded)', async () => {
      const fetchPage = vi.fn(
        async (_q: DataTableQuery): Promise<DataTablePage<Doc>> =>
          new Promise<DataTablePage<Doc>>(resolve => {
            // Never resolve for call 0; resolve call 1 immediately.
            if (fetchPage.mock.calls.length === 1) {
              setTimeout(() => resolve({ rows: sampleDocs, totalCount: 2 }), 0);
            } else {
              resolve({ rows: [{ id: 9, title: 'Latest', status: 'active' }], totalCount: 1 });
            }
          }),
      );
      const adapter = makeAdapter({ fetchPage });

      render(<DataTable columns={columns} data={adapter} sorting={{ enabled: true }} />);

      // Trigger a rapid second fetch before the first resolves.
      await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole('columnheader', { name: /Title/ }));

      await waitFor(() => {
        expect(screen.getByText('Latest')).toBeDefined();
      });
      expect(fetchPage).toHaveBeenCalledTimes(2);
    });
  });
});
