/**
 * DataTable Engine — Tier 2 wiring test
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.1
 * Rule: .claude/rules/orphan-detection.md (MUST Rule 2 — every wired engine has
 * a Tier 2 integration test), .claude/rules/facade-manager-detection.md (MUST
 * Rule 2 — *-engine.wiring.test.* naming convention adapted to frontend).
 *
 * Imports through the engine's PUBLIC barrel at `../index.ts` — never
 * deep-imports engine internals. Uses a real in-memory adapter (NOT vi.fn()
 * mocks of adapter methods) that the engine treats as a real backend:
 * fetch, paginate, sort, filter, invalidate, row action, bulk action, row
 * activation. Assertions observe user-visible effects through the rendered
 * DOM — what a user would see, not what a unit mock can prove.
 *
 * Paired-operation round-trip (per orphan-detection MUST Rule 2a generalized
 * to any paired-operation engine surface): fetchPage → rowAction.onExecute →
 * adapter.invalidate → fetchPage again. If either half drifts, the round-trip
 * fails and the test catches it — no amount of per-half unit coverage would.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  DataTable,
  isDataTableAdapter,
  resolveDataSource,
  type ColumnDef,
  type DataTableAdapter,
  type DataTableBulkAction,
  type DataTableCapabilities,
  type DataTablePage,
  type DataTableQuery,
  type DataTableRowAction,
} from '../index.js';

// --- Realistic in-memory adapter (NOT vi.fn() of every method) ---

interface Invoice {
  id: string;
  company: string;
  amount: number;
  status: 'draft' | 'sent' | 'paid';
}

/**
 * A real adapter implementation. The engine calls it, it returns real data.
 * No `vi.fn()` stands in for a method — every method has a concrete body.
 * A test that spies on the adapter does so with `vi.spyOn` on the concrete
 * instance so the real behavior still runs.
 */
function createInvoiceAdapter(
  initialRows: Invoice[],
): DataTableAdapter<Invoice, string> & {
  readonly storage: Map<string, Invoice>;
  readonly invalidateCount: { n: number };
} {
  const storage = new Map<string, Invoice>(initialRows.map((r) => [r.id, r]));
  const invalidateCount = { n: 0 };

  const adapter: DataTableAdapter<Invoice, string> = {
    getRowId: (row) => row.id,
    capabilities: (): DataTableCapabilities => ({
      serverPagination: true,
      paginationMode: 'offset',
      sortableFields: ['company', 'amount'],
      filterableFields: ['status'],
      globalSearch: true,
    }),
    fetchPage: async (query: DataTableQuery): Promise<DataTablePage<Invoice>> => {
      let rows = Array.from(storage.values());
      if (query.globalSearch) {
        const q = query.globalSearch.toLowerCase();
        rows = rows.filter(
          (r) => r.company.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
        );
      }
      if (query.filters['status']) {
        rows = rows.filter((r) => r.status === query.filters['status']);
      }
      if (query.sort.length > 0) {
        const first = query.sort[0]!;
        rows.sort((a, b) => {
          const av = a[first.field as keyof Invoice];
          const bv = b[first.field as keyof Invoice];
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return first.direction === 'asc' ? cmp : -cmp;
        });
      }
      const total = rows.length;
      const start = query.page * query.pageSize;
      const pageRows = rows.slice(start, start + query.pageSize);
      return { rows: pageRows, totalCount: total };
    },
    invalidate: () => {
      invalidateCount.n += 1;
    },
  };

  return Object.assign(adapter, { storage, invalidateCount });
}

// --- Fixtures ---

const columns: ColumnDef<Invoice>[] = [
  { field: 'id', header: 'ID' },
  { field: 'company', header: 'Company' },
  { field: 'amount', header: 'Amount' },
  { field: 'status', header: 'Status' },
];

function sampleInvoices(): Invoice[] {
  return [
    { id: 'INV-001', company: 'Alpha Ltd', amount: 1000, status: 'draft' },
    { id: 'INV-002', company: 'Beta Inc', amount: 2500, status: 'sent' },
    { id: 'INV-003', company: 'Gamma Co', amount: 750, status: 'paid' },
    { id: 'INV-004', company: 'Delta LLC', amount: 5000, status: 'sent' },
  ];
}

beforeEach(() => {
  vi.restoreAllMocks();
  Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
});

// --- Tests ---

describe('DataTable engine — barrel wiring', () => {
  it('re-exports public surface through the barrel', () => {
    // DO — the consumer imports from the engine barrel only.
    // This test asserts the barrel's advertised surface is a live binding.
    expect(typeof DataTable).toBe('function');
    expect(typeof isDataTableAdapter).toBe('function');
    expect(typeof resolveDataSource).toBe('function');
  });

  it('type guard recognizes a real adapter instance', () => {
    const adapter = createInvoiceAdapter(sampleInvoices());
    expect(isDataTableAdapter(adapter)).toBe(true);
    expect(isDataTableAdapter([])).toBe(false);
    expect(isDataTableAdapter({ getRowId: 1 })).toBe(false);
  });

  it('renders rows fetched from a real in-memory adapter', async () => {
    const adapter = createInvoiceAdapter(sampleInvoices());
    render(<DataTable columns={columns} data={adapter} />);

    // User sees rows from the adapter's fetchPage output.
    await waitFor(() => {
      expect(screen.getByText('Alpha Ltd')).toBeDefined();
      expect(screen.getByText('Beta Inc')).toBeDefined();
      expect(screen.getByText('Gamma Co')).toBeDefined();
    });
  });

  it('round-trips: rowAction.onExecute → adapter.invalidate → refetch', async () => {
    const adapter = createInvoiceAdapter(sampleInvoices());
    // Row action mutates backing storage the adapter reads in fetchPage.
    const markPaid: DataTableRowAction<Invoice, string> = {
      id: 'mark-paid',
      label: 'Mark Paid',
      onExecute: (row) => {
        const current = adapter.storage.get(row.id);
        if (current) {
          adapter.storage.set(row.id, { ...current, status: 'paid' });
        }
      },
    };
    // Attach the row action to the adapter instance (public surface).
    Object.assign(adapter, { rowActions: [markPaid] });

    const fetchSpy = vi.spyOn(adapter, 'fetchPage');

    render(<DataTable columns={columns} data={adapter} />);

    // Wait for the initial fetch.
    await waitFor(() => expect(screen.getByText('Alpha Ltd')).toBeDefined());
    const callsBefore = fetchSpy.mock.calls.length;
    const invalidateBefore = adapter.invalidateCount.n;

    // Click the Mark Paid action on the first row.
    const buttons = screen.getAllByRole('button', { name: /mark paid/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]!);

    // Round-trip: engine invoked invalidate AND refetched.
    await waitFor(() => {
      expect(adapter.invalidateCount.n).toBe(invalidateBefore + 1);
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    });

    // Read-back: backing storage reflects the write.
    expect(adapter.storage.get('INV-001')?.status).toBe('paid');
  });

  it('global search triggers a new fetchPage with the query', async () => {
    const adapter = createInvoiceAdapter(sampleInvoices());
    const fetchSpy = vi.spyOn(adapter, 'fetchPage');

    render(
      <DataTable
        columns={columns}
        data={adapter}
        filtering={{ enabled: true, globalSearch: true, debounceMs: 0 }}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha Ltd')).toBeDefined());

    const searchInput = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'Gamma' } });

    await waitFor(() => {
      // Engine forwarded the globalSearch into a fetchPage call.
      const called = fetchSpy.mock.calls.some(
        ([q]) => (q as DataTableQuery).globalSearch === 'Gamma',
      );
      expect(called).toBe(true);
    });

    // User-visible effect: only the matching row is present.
    await waitFor(() => {
      expect(screen.queryByText('Alpha Ltd')).toBeNull();
      expect(screen.getByText('Gamma Co')).toBeDefined();
    });
  });

  it('bulk action receives the selected rows', async () => {
    const adapter = createInvoiceAdapter(sampleInvoices());
    const executed: string[] = [];
    const archive: DataTableBulkAction<Invoice, string> = {
      id: 'archive',
      label: 'Archive',
      onExecute: (rows) => {
        rows.forEach((r) => executed.push(r.id));
      },
      minSelection: 1,
    };
    Object.assign(adapter, { bulkActions: [archive] });

    render(
      <DataTable
        columns={columns}
        data={adapter}
        selection={{ enabled: true, mode: 'multi' }}
      />,
    );

    await waitFor(() => expect(screen.getByText('Alpha Ltd')).toBeDefined());

    // Select the first two data rows by clicking their row checkboxes.
    const checkboxes = screen.getAllByRole('checkbox');
    // The first checkbox is the select-all header; pick the next two.
    await act(async () => {
      fireEvent.click(checkboxes[1]!);
      fireEvent.click(checkboxes[2]!);
    });

    // Bulk action toolbar appears with the Archive button.
    const archiveBtn = await screen.findByRole('button', { name: /archive/i });
    await act(async () => {
      fireEvent.click(archiveBtn);
    });

    expect(executed.length).toBe(2);
    expect(executed[0]).toMatch(/^INV-/);
  });
});
