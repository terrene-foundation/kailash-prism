/**
 * useDataTable — Core state management hook for the DataTable engine
 *
 * Manages sorting, filtering, pagination, and selection state.
 * Handles both client-side and server-side data sources.
 */

import { useCallback, useMemo, useState } from 'react';
import type {
  DataTableConfig,
  DataTableRow,
  SortState,
} from './types.js';

export interface UseDataTableResult<T extends DataTableRow> {
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
  /** Get stable ID for a row */
  getRowId: (row: T, index: number) => string;
  /** Set of expanded row IDs */
  expandedIds: Set<string>;
  /** Toggle expand/collapse of a row */
  handleToggleExpand: (index: number) => void;
}

export function useDataTable<T extends DataTableRow>(
  config: DataTableConfig<T>,
): UseDataTableResult<T> {
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
  } = config;

  // Is data a static array?
  const isClientSide = Array.isArray(data);
  const clientData = isClientSide ? data : [];

  // --- Sorting state ---
  const [sorts, setSorts] = useState<SortState[]>(() => {
    if (sorting?.defaultSort) {
      return [sorting.defaultSort];
    }
    return [];
  });

  // --- Filter state ---
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [globalSearch, setGlobalSearch] = useState('');

  // --- Pagination state ---
  const defaultPageSize = pagination?.defaultPageSize ?? 25;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // --- Selection state ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Expand state ---
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // --- Row ID resolution ---
  const getRowId = useCallback((row: T, index: number): string => {
    // Prefer 'id' field if present, fall back to index
    const id = row['id'];
    if (id != null) return String(id);
    return String(index);
  }, []);

  // --- Client-side processing ---

  const filteredData = useMemo(() => {
    if (!isClientSide) return clientData;

    let result = [...clientData];

    // Global search
    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.field];
          return val != null && String(val).toLowerCase().includes(query);
        }),
      );
    }

    // Column filters
    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim() !== '');
    if (activeFilters.length > 0) {
      result = result.filter((row) =>
        activeFilters.every(([field, filterVal]) => {
          const val = row[field];
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
        const aVal = a[sort.field];
        const bVal = b[sort.field];

        if (aVal == null && bVal == null) continue;
        if (aVal == null) return sort.direction === 'asc' ? -1 : 1;
        if (bVal == null) return sort.direction === 'asc' ? 1 : -1;

        const aStr = String(aVal);
        const bStr = String(bVal);

        // Try numeric comparison
        const aNum = Number(aStr);
        const bNum = Number(bStr);
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
          const diff = aNum - bNum;
          if (diff !== 0) return sort.direction === 'asc' ? diff : -diff;
          continue;
        }

        const cmp = aStr.localeCompare(bStr);
        if (cmp !== 0) return sort.direction === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  }, [isClientSide, filteredData, sorts]);

  const totalCount = isClientSide ? sortedData.length : 0;

  const paginationEnabled = pagination?.enabled !== false;
  const displayRows = useMemo(() => {
    if (!isClientSide) return clientData;
    if (!paginationEnabled) return sortedData;

    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [isClientSide, clientData, sortedData, paginationEnabled, page, pageSize]);

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
      setGlobalSearch(query);
      setPage(0);
    },
    [],
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
  };
}
