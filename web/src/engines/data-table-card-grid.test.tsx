/**
 * DataTable card-grid display mode tests.
 *
 * Covers display="card-grid" rendering: rows-as-cards, adapter rowActions
 * in card footers, empty/loading/error states, custom renderCard slot,
 * onRowActivate on card click.
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.1
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
} from './data-table.js';

interface Doc {
  id: number;
  title: string;
  status: string;
}

const columns: ColumnDef<Doc>[] = [
  { field: 'title', header: 'Title' },
  { field: 'status', header: 'Status' },
  { field: 'id', header: 'ID' },
];

const sampleDocs: Doc[] = [
  { id: 1, title: 'Contract', status: 'active' },
  { id: 2, title: 'Policy', status: 'draft' },
];

function makeAdapter(overrides: Partial<DataTableAdapter<Doc, string>> = {}): DataTableAdapter<Doc, string> {
  return {
    getRowId: (row: Doc) => String(row.id),
    capabilities: (): DataTableCapabilities => ({ serverPagination: true }),
    fetchPage: async (_q: DataTableQuery): Promise<DataTablePage<Doc>> => ({
      rows: sampleDocs,
      totalCount: sampleDocs.length,
    }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('DataTable display="card-grid"', () => {
  describe('rendering', () => {
    it('renders each row as a Card', async () => {
      render(<DataTable columns={columns} data={sampleDocs} display="card-grid" />);

      await waitFor(() => {
        expect(screen.getByTestId('data-table-card-0')).toBeDefined();
        expect(screen.getByTestId('data-table-card-1')).toBeDefined();
      });
    });

    it('uses first column as title, second as subtitle (default)', async () => {
      render(<DataTable columns={columns} data={sampleDocs} display="card-grid" />);
      await waitFor(() => {
        expect(screen.getByText('Contract')).toBeDefined();
        expect(screen.getByText('active')).toBeDefined();
      });
    });

    it('wraps cards in CardGrid with list semantics', async () => {
      render(
        <DataTable
          columns={columns}
          data={sampleDocs}
          display="card-grid"
          aria-label="Documents"
        />,
      );
      await waitFor(() => {
        expect(screen.getByRole('list').getAttribute('aria-label')).toBe('Documents');
      });
      expect(screen.getAllByRole('listitem').length).toBe(2);
    });

    it('respects cardGridColumns configuration', async () => {
      const { container } = render(
        <DataTable
          columns={columns}
          data={sampleDocs}
          display="card-grid"
          cardGridColumns={{ mobile: 2, tablet: 2, desktop: 3, wide: 3 }}
        />,
      );
      await waitFor(() => {
        expect(container.querySelector('.prism-card-grid-2-2-3-3')).not.toBeNull();
      });
    });
  });

  describe('renderCard slot', () => {
    it('invokes renderCard for each row when supplied', async () => {
      const renderCard = vi.fn((row: Doc) =>
        <span data-testid={`custom-body-${String(row.id)}`}>Custom: {row.title}</span>
      );
      render(
        <DataTable
          columns={columns}
          data={sampleDocs}
          display="card-grid"
          renderCard={renderCard}
        />,
      );
      await waitFor(() => {
        expect(screen.getByTestId('custom-body-1').textContent).toBe('Custom: Contract');
        expect(screen.getByTestId('custom-body-2').textContent).toBe('Custom: Policy');
      });
      expect(renderCard).toHaveBeenCalledTimes(2);
    });
  });

  describe('row actions in footer', () => {
    it('renders adapter.rowActions as buttons in each card footer', async () => {
      const adapter = makeAdapter({
        rowActions: [
          { id: 'preview', label: 'Preview', onExecute: vi.fn().mockResolvedValue(undefined) },
          { id: 'delete', label: 'Delete', variant: 'destructive', onExecute: vi.fn().mockResolvedValue(undefined) },
        ],
      });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      expect(screen.getAllByRole('button', { name: 'Preview' }).length).toBe(2);
      expect(screen.getAllByRole('button', { name: 'Delete' }).length).toBe(2);
    });

    it('action click fires onExecute with correct row + id', async () => {
      const onExecute = vi.fn().mockResolvedValue(undefined);
      const adapter = makeAdapter({
        rowActions: [{ id: 'op', label: 'Operate', onExecute }],
      });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const firstBtn = screen.getAllByRole('button', { name: 'Operate' })[0]!;
      fireEvent.click(firstBtn);
      await waitFor(() => expect(onExecute).toHaveBeenCalledTimes(1));
      expect(onExecute).toHaveBeenCalledWith(sampleDocs[0], '1');
    });

    it('action click does not activate the card (stopPropagation)', async () => {
      const onRowActivate = vi.fn();
      const onExecute = vi.fn().mockResolvedValue(undefined);
      const adapter = makeAdapter({
        onRowActivate,
        rowActions: [{ id: 'op', label: 'Operate', onExecute }],
      });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const btn = screen.getAllByRole('button', { name: 'Operate' })[0]!;
      fireEvent.click(btn);
      await waitFor(() => expect(onExecute).toHaveBeenCalled());
      expect(onRowActivate).not.toHaveBeenCalled();
    });

    it('respects per-action visible predicate', async () => {
      const adapter = makeAdapter({
        rowActions: [{
          id: 'only-draft',
          label: 'Publish',
          onExecute: vi.fn(),
          visible: (row) => row.status === 'draft',
        }],
      });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      expect(screen.getAllByRole('button', { name: 'Publish' })).toHaveLength(1);
    });

    it('renders anchor when action.href is supplied (parity with table mode)', async () => {
      const adapter = makeAdapter({
        rowActions: [{
          id: 'preview',
          label: 'Preview',
          href: (_row, id) => `/docs/${id}/preview`,
        }],
      });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const link = screen.getAllByRole('link', { name: 'Preview' })[0]!;
      expect(link.getAttribute('href')).toBe('/docs/1/preview');
    });

    it('sanitizes javascript: hrefs in card-grid action footers', async () => {
      const adapter = makeAdapter({
        rowActions: [{
          id: 'link',
          label: 'Link',
          href: () => 'javascript:alert(1)',
        }],
      });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const link = screen.getAllByRole('link', { name: 'Link' })[0]!;
      expect(link.getAttribute('href')).toBe('#');
    });

    it('sanitizes data: hrefs in card-grid action footers', async () => {
      const adapter = makeAdapter({
        rowActions: [{
          id: 'link',
          label: 'Link',
          href: () => 'data:text/html,<script>alert(1)</script>',
        }],
      });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());
      const link = screen.getAllByRole('link', { name: 'Link' })[0]!;
      expect(link.getAttribute('href')).toBe('#');
    });

    it('anchor click does not activate the card (stopPropagation)', async () => {
      const onRowActivate = vi.fn();
      const adapter = makeAdapter({
        onRowActivate,
        rowActions: [{ id: 'view', label: 'View', href: (_r, id) => `/doc/${id}` }],
      });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const link = screen.getAllByRole('link', { name: 'View' })[0]!;
      fireEvent.click(link);
      expect(onRowActivate).not.toHaveBeenCalled();
    });
  });

  describe('card activation', () => {
    it('card click fires adapter.onRowActivate', async () => {
      const onRowActivate = vi.fn();
      const adapter = makeAdapter({ onRowActivate });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const firstCard = screen.getByTestId('data-table-card-0');
      fireEvent.click(firstCard);
      expect(onRowActivate).toHaveBeenCalledWith(sampleDocs[0]);
    });

    it('card click fires config.onRowClick with (row, id) when no adapter onRowActivate', async () => {
      const onRowClick = vi.fn();
      render(
        <DataTable
          columns={columns}
          data={sampleDocs}
          display="card-grid"
          onRowClick={onRowClick}
        />,
      );
      await waitFor(() => expect(screen.getByText('Contract')).toBeDefined());

      const firstCard = screen.getByTestId('data-table-card-0');
      fireEvent.click(firstCard);
      // Since 0.4.0 — config.onRowClick receives (row, id: TId). For plain
      // array data with a numeric `id` field, TId defaults to string and
      // the engine falls back to `String(row.id)`.
      expect(onRowClick).toHaveBeenCalledWith(sampleDocs[0], '1');
    });
  });

  describe('states', () => {
    it('renders empty state when data is empty array', () => {
      render(<DataTable columns={columns} data={[]} display="card-grid" />);
      expect(screen.getByText('No items to display')).toBeDefined();
    });

    it('renders loading state when adapter.fetchPage is pending', async () => {
      const fetchPage = vi.fn(
        () => new Promise<DataTablePage<Doc>>(() => { /* never resolves */ }),
      );
      const adapter = makeAdapter({ fetchPage });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      // Loading state renders skeleton cards.
      await waitFor(() => {
        expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
      });
    });

    it('renders error state when adapter.fetchPage rejects', async () => {
      const fetchPage = vi.fn().mockRejectedValue(new Error('backend failure'));
      const adapter = makeAdapter({ fetchPage });
      render(<DataTable columns={columns} data={adapter} display="card-grid" />);
      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toContain('backend failure');
      });
    });
  });

  describe('interoperability', () => {
    it('default display falls back to table mode (unchanged behavior)', async () => {
      render(<DataTable columns={columns} data={sampleDocs} />);
      await waitFor(() => {
        // Table grid role — card-grid would have role=list
        expect(screen.getByRole('grid')).toBeDefined();
      });
    });

    it('display="table" explicitly still uses table mode', async () => {
      render(<DataTable columns={columns} data={sampleDocs} display="table" />);
      await waitFor(() => {
        expect(screen.getByRole('grid')).toBeDefined();
      });
    });
  });
});
