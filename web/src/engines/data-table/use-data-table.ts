/**
 * useDataTable — Core state management hook for the DataTable engine
 *
 * Manages sorting, filtering, pagination, and selection state.
 * Handles both client-side (array) and adapter-driven (`DataTableAdapter`)
 * data sources. For adapter sources, the hook calls `adapter.fetchPage(query)`
 * on mount and on every state change, tracks its own loading / error
 * lifecycle, and uses an AbortController to cancel in-flight requests when
 * params change.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DataTableBulkAction,
  DataTableConfig,
  DataTableRow,
  DataTableRowAction,
  SortState,
} from './types.js';
import { resolveDataSource } from './adapter.js';

export interface UseDataTableResult<T extends DataTableRow, TId = string> {
  /** Rows to display on the current page */
  displayRows: T[];
  /** Total count of rows (pre-pagination) */
  totalCount: number;
  /** Current page (0-indexed) */
  page: number;
  /** Current page size */
  pageSize: number;
  /** Active sorts */
  sorts: SortState[];
  /** Active column filters */
  filters: Record<string, string>;
  /** Global search query */
  globalSearch: string;
  /** Selected row IDs */
  selectedIds: Set<string>;
  /** Selected row objects */
  selectedRows: T[];
  /** Whether all visible rows are selected */
  allSelected: boolean;
  /** Whether some (but not all) visible rows are selected */
  someSelected: boolean;
  /** Whether a server-side fetch is in flight (undefined for client-side data) */
  serverLoading: boolean;
  /** Error from the most recent server fetch, if any */
  serverError: string | null;
  /** Retry the most recent server fetch (no-op for client-side data) */
  retryServerFetch: () => void;
  /** Handle single-column sort (replaces existing sorts) */
  handleSort: (field: string) => void;
  /** Handle multi-sort (shift-click — toggles the field in sort list) */
  handleMultiSort: (field: string) => void;
  /** Handle column filter change */
  handleFilterChange: (field: string, value: string) => void;
  /** Handle global search change */
  handleGlobalSearch: (query: string) => void;
  /** Handle page change */
  handlePageChange: (page: number) => void;
  /** Handle page size change */
  handlePageSizeChange: (pageSize: number) => void;
  /** Toggle selection of a single row */
  handleToggleRow: (index: number) => void;
  /** Toggle select all / deselect all */
  handleSelectAll: () => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Get stable ID for a row (stringified — used for DOM keys and selection state). */
  getRowId: (row: T, index: number) => string;
  /**
   * Get the typed row-id for callback surfaces (since 0.4.0). Mirrors the
   * adapter's `getRowId` return type so consumer callbacks receive the
   * declared `TId` (e.g. `number`) without `Number(id)` coercion at the
   * call site. Falls back to the stringified id when no adapter is
   * wired.
   */
  getTypedRowId: (row: T, index: number) => TId;
  /** Set of expanded row IDs */
  expandedIds: Set<string>;
  /** Toggle expand/collapse of a row */
  handleToggleExpand: (index: number) => void;
  /**
   * Row-activation handler resolved from the adapter (or undefined when no
   * adapter is provided). Consumed by DataTableBody to run on row click
   * when the click did not originate inside a rowActions button.
   */
  onRowActivate?: (row: T) => Promise<void> | void;
  /**
   * Merged per-row actions — adapter-declared first, then any config-level
   * actions (reserved for future extension). Consumed by DataTableBody to
   * render the trailing actions column.
   */
  rowActions: ReadonlyArray<DataTableRowAction<T, TId>>;
  /**
   * Merged bulk actions — adapter-declared first, then `config.bulkActions`.
   * Consumed by the bulk-action toolbar.
   */
  adapterBulkActions: ReadonlyArray<DataTableBulkAction<T, TId>>;
  /**
   * Invoke a row action. The engine calls `onExecute(row, id)`, awaits it,
   * calls `adapter.invalidate?.()` on success, and triggers a refetch of
   * the current page. Rejections are surfaced to the caller.
   */
  executeRowAction: (
    action: DataTableRowAction<T, TId>,
    row: T,
    rowIndex: number,
  ) => Promise<void>;
  /**
   * Invoke a bulk action over the currently selected rows. Same lifecycle
   * as `executeRowAction` — await, invalidate, refetch.
   */
  executeBulkAction: (action: DataTableBulkAction<T, TId>) => Promise<void>;
}

export function useDataTable<T extends DataTableRow, TId = string>(
  config: DataTableConfig<T, TId>,
): UseDataTableResult<T, TId> {
  const {
    data,
    columns,
    sorting,
    filtering: _filtering,
    pagination,
    selection,
    onSort,
    onFilter,
    onPageChange: onPageChangeCb,
    onSelectionChange,
    globalSearchValue,
    onGlobalSearchChange,
  } = config;

  // --- Data-source classification ---
  // `resolveDataSource` lifts every accepted shape (plain array,
  // DataTableAdapter) into either `{adapter: DataTableAdapter, clientData: []}`
  // or `{adapter: null, clientData: T[]}`. The hook body only handles
  // two cases: array OR adapter.
  const { adapter, clientData } = useMemo(
    () => resolveDataSource<T, TId>(data),
    [data],
  );
  const isClientSide = adapter === null;

  // Read capabilities once at mount. Adapter contract: capabilities() is
  // NOT called per render — an adapter that needs to change capabilities
  // must be replaced with a new instance. We stabilize via adapter identity
  // so a memoized adapter produces a stable capabilities object.
  const capabilities = useMemo(
    () => adapter?.capabilities() ?? {},
    [adapter],
  );
  void capabilities; // reserved for client-side fallback gating in 0.4.0

  // --- Sorting state ---
  const [sorts, setSorts] = useState<SortState[]>(() => {
    if (sorting?.defaultSort) {
      return [sorting.defaultSort];
    }
    return [];
  });

  // --- Filter state ---
  const [filters, setFilters] = useState<Record<string, string>>({});
  // Uncontrolled-mode global-search state. When the parent supplies BOTH
  // `globalSearchValue` and `onGlobalSearchChange` the engine ignores this
  // state and reflects the parent's value.
  const [uncontrolledGlobalSearch, setUncontrolledGlobalSearch] = useState('');
  const isGlobalSearchControlled =
    globalSearchValue !== undefined && onGlobalSearchChange !== undefined;
  const globalSearch = isGlobalSearchControlled
    ? (globalSearchValue ?? '')
    : uncontrolledGlobalSearch;
  // Dev-mode one-sided-control warning (React convention). Fires ONCE
  // per hook instance when exactly one of the two fields is present —
  // consumers are almost certainly wiring the search incorrectly.
  const oneSidedGlobalSearchWarnedRef = useRef(false);
  useEffect(() => {
    // Dev-mode gate: `process` is not guaranteed to exist in the browser,
    // so we read it defensively. Bundlers (Vite, webpack) typically
    // replace `process.env.NODE_ENV` at build time; runtime access works
    // in Node/SSR and is a silent no-op in a pure browser where
    // `process` is undefined.
    const g =
      typeof globalThis !== 'undefined'
        ? (globalThis as { process?: { env?: { NODE_ENV?: string } } })
        : undefined;
    const nodeEnv = g?.process?.env?.NODE_ENV;
    if (nodeEnv === 'production') return;
    if (oneSidedGlobalSearchWarnedRef.current) return;
    const hasValue = globalSearchValue !== undefined;
    const hasSetter = onGlobalSearchChange !== undefined;
    if (hasValue !== hasSetter) {
      oneSidedGlobalSearchWarnedRef.current = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[prism-web DataTable] `globalSearchValue` and `onGlobalSearchChange` ' +
          'must be supplied together to opt into controlled mode. ' +
          `Got ${hasValue ? 'value without setter' : 'setter without value'}. ` +
          'Falling back to uncontrolled mode.',
      );
    }
  }, [globalSearchValue, onGlobalSearchChange]);

  // --- Pagination state ---
  const defaultPageSize = pagination?.defaultPageSize ?? 25;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // --- Selection state ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Expand state ---
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // --- Server fetch state ---
  const [serverRows, setServerRows] = useState<T[]>([]);
  const [serverTotal, setServerTotal] = useState<number>(0);
  const [serverLoading, setServerLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // Monotonic request id — used to discard stale results from aborted fetches
  const fetchSeqRef = useRef(0);
  // Tick used to force a refetch on retry
  const [retryTick, setRetryTick] = useState(0);

  // --- Row ID resolution ---
  // Precedence: adapter.getRowId > config.getRowId > row['id'] > index.
  // The adapter form takes precedence because it's part of the adapter's
  // typed contract; config.getRowId is a pre-adapter shim kept for the
  // array-data path. `row['id']` is the last-resort fallback for objects
  // that happen to carry an `id` field.
  const configGetRowId = config.getRowId;
  const getRowId = useCallback(
    (row: T, index: number): string => {
      if (adapter) {
        const aid = adapter.getRowId(row);
        // Treat null / undefined / empty-string as "no id" so adapters
        // that return '' on a missing field (legacy shim pattern) fall
        // through to the engine's default instead of collapsing every
        // empty-id row into the same selection key.
        if (aid != null && String(aid) !== '') return String(aid);
      }
      if (configGetRowId) return configGetRowId(row, index);
      const asRecord = row as Record<string, unknown>;
      const id = asRecord['id'];
      if (id != null) return String(id);
      return String(index);
    },
    [adapter, configGetRowId],
  );
  // Typed row-id resolver for CALLBACK surfaces (rowAction.onExecute,
  // bulkAction.onExecute, onRowClick). Returns the adapter's typed
  // `TId` when the adapter declares one, otherwise falls back to the
  // stringified id from `getRowId`. Keeps DOM/selection state stable
  // on string ids (see ResolvedTableState.selectedIds docstring) while
  // callbacks receive the consumer's declared TId unchanged.
  const getTypedRowId = useCallback(
    (row: T, index: number): TId => {
      if (adapter) {
        const aid = adapter.getRowId(row);
        if (aid != null && String(aid) !== '') return aid;
      }
      // No typed adapter — fall back to the string surface (TId defaults
      // to string in that case). The cast is safe: when no adapter is
      // present TId is either the default `string` or a user-chosen type
      // for which getTypedRowId is documented as returning stringified.
      return getRowId(row, index) as unknown as TId;
    },
    [adapter, getRowId],
  );

  // --- Server-side fetch effect (adapter path) ---
  // Monotonic sequence discards stale results from superseded requests.
  // AbortController signals cancellation to adapters that honor it.
  useEffect(() => {
    if (adapter === null) return;
    const seq = ++fetchSeqRef.current;
    const controller = new AbortController();
    setServerLoading(true);
    setServerError(null);
    const paginationEnabled = pagination?.enabled !== false;
    void adapter
      .fetchPage({
        page,
        pageSize,
        sort: sorts,
        filters,
        globalSearch,
        signal: controller.signal,
      })
      .then((result) => {
        // Discard stale results from a superseded request.
        if (seq !== fetchSeqRef.current) return;
        setServerRows([...result.rows]);
        setServerTotal(
          typeof result.totalCount === 'number' && result.totalCount >= 0
            ? result.totalCount
            : result.rows.length,
        );
        setServerLoading(false);
        // Clamp page if the underlying total shrank below the current page.
        if (
          paginationEnabled &&
          result.totalCount > 0 &&
          page > 0 &&
          page * pageSize >= result.totalCount
        ) {
          setPage(Math.max(0, Math.ceil(result.totalCount / pageSize) - 1));
        }
      })
      .catch((err: unknown) => {
        if (seq !== fetchSeqRef.current) return;
        // AbortError from an in-flight cancellation is expected, not a user
        // error. Leave the previous serverRows / serverError in place.
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const raw = err instanceof Error ? err.message : String(err);
        // Bound the error banner length so adapter errors with embedded
        // stack traces don't render multi-page error surfaces.
        setServerError(raw.slice(0, 500));
        setServerLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [adapter, page, pageSize, sorts, filters, globalSearch, retryTick, pagination?.enabled]);

  const retryServerFetch = useCallback(() => {
    if (adapter === null) return;
    setRetryTick((t) => t + 1);
  }, [adapter]);

  // --- Client-side processing ---

  const filteredData = useMemo(() => {
    if (!isClientSide) return [] as T[];

    let result = [...clientData];

    // Global search
    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = (row as Record<string, unknown>)[col.field];
          return val != null && String(val).toLowerCase().includes(query);
        }),
      );
    }

    // Column filters
    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim() !== '');
    if (activeFilters.length > 0) {
      result = result.filter((row) =>
        activeFilters.every(([field, filterVal]) => {
          const val = (row as Record<string, unknown>)[field];
          return val != null && String(val).toLowerCase().includes(filterVal.toLowerCase());
        }),
      );
    }

    return result;
  }, [isClientSide, clientData, globalSearch, filters, columns]);

  const sortedData = useMemo(() => {
    if (!isClientSide || sorts.length === 0) return filteredData;

    return [...filteredData].sort((a, b) => {
      for (const sort of sorts) {
        const cmp = defaultSortComparator(
          a,
          b,
          sort.field as keyof T,
          sort.direction,
        );
        if (cmp !== 0) return cmp;
      }
      return 0;
    });
  }, [isClientSide, filteredData, sorts]);

  const paginationEnabled = pagination?.enabled !== false;

  const totalCount = isClientSide ? sortedData.length : serverTotal;

  const displayRows = useMemo(() => {
    if (!isClientSide) return serverRows;
    if (!paginationEnabled) return sortedData;

    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [isClientSide, serverRows, sortedData, paginationEnabled, page, pageSize]);

  // --- Selected row objects ---
  const selectedRows = useMemo(() => {
    if (selectedIds.size === 0) return [];
    return displayRows.filter((row, index) => selectedIds.has(getRowId(row, index)));
  }, [displayRows, selectedIds, getRowId]);

  const allSelected = displayRows.length > 0 && displayRows.every((row, i) => selectedIds.has(getRowId(row, i)));
  const someSelected = !allSelected && displayRows.some((row, i) => selectedIds.has(getRowId(row, i)));

  // --- Handlers ---

  const handleSort = useCallback(
    (field: string) => {
      setSorts((prev) => {
        const existing = prev.find((s) => s.field === field);
        let next: SortState[];
        if (existing) {
          next =
            existing.direction === 'asc'
              ? [{ field, direction: 'desc' }]
              : []; // Remove sort on third click
        } else {
          next = [{ field, direction: 'asc' }];
        }
        onSort?.(next);
        return next;
      });
    },
    [onSort],
  );

  const handleMultiSort = useCallback(
    (field: string) => {
      if (sorting?.mode !== 'multi') {
        handleSort(field);
        return;
      }
      setSorts((prev) => {
        const existingIndex = prev.findIndex((s) => s.field === field);
        let next: SortState[];
        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          if (!existing) return prev;
          next = [...prev];
          if (existing.direction === 'asc') {
            next[existingIndex] = { field, direction: 'desc' };
          } else {
            next.splice(existingIndex, 1);
          }
        } else {
          next = [...prev, { field, direction: 'asc' }];
        }
        onSort?.(next);
        return next;
      });
    },
    [sorting?.mode, handleSort, onSort],
  );

  const handleFilterChange = useCallback(
    (field: string, value: string) => {
      setFilters((prev) => {
        const next = { ...prev, [field]: value };
        onFilter?.(next);
        return next;
      });
      setPage(0); // Reset to first page on filter change
    },
    [onFilter],
  );

  const handleGlobalSearch = useCallback(
    (query: string) => {
      if (isGlobalSearchControlled) {
        onGlobalSearchChange?.(query);
      } else {
        setUncontrolledGlobalSearch(query);
      }
      setPage(0);
    },
    [isGlobalSearchControlled, onGlobalSearchChange],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      onPageChangeCb?.({ page: newPage, pageSize });
    },
    [pageSize, onPageChangeCb],
  );

  const handlePageSizeChange = useCallback(
    (newSize: number) => {
      setPageSize(newSize);
      setPage(0);
      onPageChangeCb?.({ page: 0, pageSize: newSize });
    },
    [onPageChangeCb],
  );

  const handleToggleRow = useCallback(
    (index: number) => {
      const row = displayRows[index];
      if (!row) return;
      const id = getRowId(row, index);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          if (selection?.mode === 'single') {
            next.clear();
          }
          next.add(id);
        }
        // Compute new selection for callback
        const newSelected = displayRows.filter((r, i) => next.has(getRowId(r, i)));
        onSelectionChange?.(newSelected);
        return next;
      });
    },
    [displayRows, getRowId, selection?.mode, onSelectionChange],
  );

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(displayRows.map((row, i) => getRowId(row, i)));
      setSelectedIds(allIds);
      onSelectionChange?.(displayRows);
    }
  }, [allSelected, displayRows, getRowId, onSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    onSelectionChange?.([]);
  }, [onSelectionChange]);

  const handleToggleExpand = useCallback(
    (index: number) => {
      const row = displayRows[index];
      if (!row) return;
      const id = getRowId(row, index);
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [displayRows, getRowId],
  );

  // --- Adapter action bridges ---
  //
  // `executeRowAction` / `executeBulkAction` are the canonical paths from a
  // user clicking an action button or bulk-action button to the adapter's
  // `onExecute` callback running, followed (on success) by a cache
  // invalidation and a page refetch.
  //
  // Error handling: `onExecute` rejections propagate to the caller — the
  // engine does NOT swallow them. Consumers that want centralised error
  // UI should await these and show their own toast / banner.

  const rowActions: ReadonlyArray<DataTableRowAction<T, TId>> = adapter?.rowActions ?? [];
  const adapterBulkActions: ReadonlyArray<DataTableBulkAction<T, TId>> = adapter?.bulkActions ?? [];
  const adapterOnRowActivate = adapter?.onRowActivate;

  const executeRowAction = useCallback(
    async (action: DataTableRowAction<T, TId>, row: T, rowIndex: number): Promise<void> => {
      if (!action.onExecute) return;
      const id = getTypedRowId(row, rowIndex);
      await action.onExecute(row, id);
      // Invalidate adapter caches (if any) then refetch so the UI reflects
      // whatever the action mutated server-side. If invalidate() itself
      // rejects we STILL refetch — the action's side effect already
      // landed, and leaving the UI with stale rows + no error signal is
      // worse than showing an error banner after the refetch completes.
      if (adapter?.invalidate) {
        try {
          await adapter.invalidate();
        } catch (err) {
          // Surface via serverError so operators see invalidate failures
          // instead of silent rotting caches.
          const message = err instanceof Error ? err.message : String(err);
          setServerError(message.slice(0, 500));
        }
      }
      if (adapter) {
        setRetryTick((t) => t + 1);
      }
    },
    [adapter, getTypedRowId],
  );

  const executeBulkAction = useCallback(
    async (action: DataTableBulkAction<T, TId>): Promise<void> => {
      if (selectedRows.length === 0) return;
      const ids = selectedRows.map((row, i) => getTypedRowId(row, i));
      await action.onExecute(selectedRows, ids);
      if (adapter?.invalidate) {
        try {
          await adapter.invalidate();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setServerError(message.slice(0, 500));
        }
      }
      if (adapter) {
        setRetryTick((t) => t + 1);
      }
      // Clear selection after bulk action completes — the mutated rows
      // may no longer exist or may match different criteria after refetch.
      setSelectedIds(new Set());
      onSelectionChange?.([]);
    },
    [adapter, selectedRows, getTypedRowId, onSelectionChange],
  );

  return {
    displayRows,
    totalCount,
    page,
    pageSize,
    sorts,
    filters,
    globalSearch,
    selectedIds,
    selectedRows,
    allSelected,
    someSelected,
    serverLoading,
    serverError,
    retryServerFetch,
    handleSort,
    handleMultiSort,
    handleFilterChange,
    handleGlobalSearch,
    handlePageChange,
    handlePageSizeChange,
    handleToggleRow,
    handleSelectAll,
    clearSelection,
    getRowId,
    expandedIds,
    handleToggleExpand,
    ...(adapterOnRowActivate !== undefined ? { onRowActivate: adapterOnRowActivate } : {}),
    rowActions,
    adapterBulkActions,
    executeRowAction,
    executeBulkAction,
    getTypedRowId,
  };
}

/**
 * Default row comparator used by the engine for client-side sort (since
 * 0.4.0). Exported so consumers implementing custom virtualised row
 * layouts can reuse the engine's sort semantics without re-deriving them.
 *
 * Contract:
 *
 *  - `null` / `undefined` on either side: null-like values sort FIRST in
 *    ascending order (LAST in descending), mirroring PostgreSQL's
 *    `NULLS FIRST` default on `ORDER BY ASC`.
 *  - Both values numeric-coercible: compared numerically.
 *  - Otherwise: stringified + `localeCompare` (locale-aware string sort).
 *
 * The comparator operates on the ROW shape (`T[keyof T]`), NOT on the row
 * id — this is why the function is TId-independent and can be exported
 * without the engine's TId generic.
 */
export function defaultSortComparator<T>(
  a: T,
  b: T,
  key: keyof T,
  direction: 'asc' | 'desc',
): number {
  const aVal = (a as Record<string, unknown>)[key as string];
  const bVal = (b as Record<string, unknown>)[key as string];

  if (aVal == null && bVal == null) return 0;
  if (aVal == null) return direction === 'asc' ? -1 : 1;
  if (bVal == null) return direction === 'asc' ? 1 : -1;

  const aStr = String(aVal);
  const bStr = String(bVal);

  // Try numeric comparison
  const aNum = Number(aStr);
  const bNum = Number(bStr);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    const diff = aNum - bNum;
    if (diff !== 0) return direction === 'asc' ? diff : -diff;
    return 0;
  }

  const cmp = aStr.localeCompare(bStr);
  return direction === 'asc' ? cmp : -cmp;
}
