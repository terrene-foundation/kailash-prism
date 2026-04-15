/**
 * Regression: `ServerDataSource.fetchData` was declared on the public type
 * surface of the DataTable engine but `useDataTable` never invoked it —
 * consumers who passed `data: serverSource` got a permanently empty table.
 *
 * Surfaced independently by M-02 (my-payslips) and M-03 (/documents) during
 * the 2026-04-14 Phase 2 Prism pilot migrations. Fix D1 in M-04 wires
 * `useDataTable` to call `fetchData(params)` on mount and on every state
 * change, with abort handling, loading/error lifecycle, and stale-response
 * rejection.
 *
 * This test MUST fail if the wiring regresses (e.g. a future refactor drops
 * the effect or mis-stores the result). It exercises the public hook
 * directly, not through `<DataTable>`, so the failure localises to the
 * state-management layer where the regression lives.
 */

import { describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useDataTable } from '../../engines/data-table/use-data-table.js';
import type {
  DataTableConfig,
  ServerDataSource,
  ServerFetchParams,
  ServerFetchResult,
} from '../../engines/data-table/types.js';

interface Row {
  id: number;
  name: string;
}

function makeSource(
  pageFactory: (params: ServerFetchParams) => ServerFetchResult<Row>,
): { source: ServerDataSource<Row>; calls: ServerFetchParams[] } {
  const calls: ServerFetchParams[] = [];
  const source: ServerDataSource<Row> = {
    fetchData: async (params: ServerFetchParams): Promise<ServerFetchResult<Row>> => {
      calls.push(params);
      return pageFactory(params);
    },
  };
  return { source, calls };
}

function baseConfig(
  data: DataTableConfig<Row>['data'],
): DataTableConfig<Row> {
  return {
    columns: [
      { field: 'id', header: 'ID' },
      { field: 'name', header: 'Name' },
    ],
    data,
    pagination: { enabled: true, defaultPageSize: 10 },
  };
}

describe('Regression: ServerDataSource.fetchData is invoked by useDataTable', () => {
  it('calls fetchData on mount with initial params', async () => {
    const { source, calls } = makeSource(() => ({
      items: [{ id: 1, name: 'Alice' }],
      totalCount: 1,
    }));

    const { result } = renderHook(() => useDataTable(baseConfig(source)));

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    const firstCall = calls[0]!;
    expect(firstCall.page).toBe(0);
    expect(firstCall.pageSize).toBe(10);
    expect(firstCall.sort).toEqual([]);
    expect(firstCall.filters).toEqual({});
    expect(firstCall.globalSearch).toBe('');

    await waitFor(() => {
      expect(result.current.displayRows).toEqual([{ id: 1, name: 'Alice' }]);
      expect(result.current.totalCount).toBe(1);
      expect(result.current.serverLoading).toBe(false);
    });
  });

  it('calls fetchData again with updated params when page / sort / filter / search change', async () => {
    const { source, calls } = makeSource((params) => ({
      items: [{ id: params.page + 1, name: `Row-${String(params.page)}` }],
      totalCount: 100,
    }));

    const { result } = renderHook(() => useDataTable(baseConfig(source)));

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
    const initialCount = calls.length;

    act(() => {
      result.current.handlePageChange(3);
    });
    await waitFor(() => {
      expect(calls.length).toBeGreaterThan(initialCount);
      expect(calls.at(-1)!.page).toBe(3);
    });

    act(() => {
      result.current.handleSort('name');
    });
    await waitFor(() => {
      const latest = calls.at(-1)!;
      expect(latest.sort).toEqual([{ field: 'name', direction: 'asc' }]);
    });

    act(() => {
      result.current.handleGlobalSearch('alice');
    });
    await waitFor(() => {
      expect(calls.at(-1)!.globalSearch).toBe('alice');
    });

    act(() => {
      result.current.handleFilterChange('name', 'a');
    });
    await waitFor(() => {
      expect(calls.at(-1)!.filters).toEqual({ name: 'a' });
    });
  });

  it('surfaces fetch errors through serverError and exposes a retry handler', async () => {
    let shouldFail = true;
    const source: ServerDataSource<Row> = {
      fetchData: vi.fn(async () => {
        if (shouldFail) throw new Error('network boom');
        return { items: [{ id: 9, name: 'After retry' }], totalCount: 1 };
      }),
    };

    const { result } = renderHook(() => useDataTable(baseConfig(source)));

    await waitFor(() => {
      expect(result.current.serverError).toBe('network boom');
      expect(result.current.serverLoading).toBe(false);
    });

    shouldFail = false;
    act(() => {
      result.current.retryServerFetch();
    });

    await waitFor(() => {
      expect(result.current.serverError).toBeNull();
      expect(result.current.displayRows).toEqual([{ id: 9, name: 'After retry' }]);
    });
  });

  it('discards stale responses when params change mid-flight (race safety)', async () => {
    const resolvers: Array<(r: ServerFetchResult<Row>) => void> = [];
    const source: ServerDataSource<Row> = {
      fetchData: (_params: ServerFetchParams) =>
        new Promise<ServerFetchResult<Row>>((resolve) => {
          resolvers.push(resolve);
        }),
    };

    const { result } = renderHook(() => useDataTable(baseConfig(source)));

    // Two fetches in flight
    act(() => {
      result.current.handlePageChange(1);
    });

    await waitFor(() => {
      expect(resolvers.length).toBeGreaterThanOrEqual(2);
    });

    // Resolve them in reverse order: the LATER request (page=1) resolves
    // first, the earlier (page=0) resolves second. The engine must keep the
    // page=1 result and discard the stale page=0 result.
    const reversed = [...resolvers].reverse();
    const latest = reversed[0]!;
    const earliest = reversed[reversed.length - 1]!;

    act(() => {
      latest({ items: [{ id: 100, name: 'page1' }], totalCount: 1 });
    });
    act(() => {
      earliest({ items: [{ id: 0, name: 'page0-stale' }], totalCount: 1 });
    });

    await waitFor(() => {
      expect(result.current.displayRows).toEqual([{ id: 100, name: 'page1' }]);
    });
  });
});
