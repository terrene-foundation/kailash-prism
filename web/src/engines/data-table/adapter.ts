/**
 * DataTableAdapter utilities — shim + type guards.
 *
 * `adaptLegacy` lifts the deprecated `ServerDataSource<T>` shape into a
 * `DataTableAdapter<T>` so the engine's hook body only has to handle one
 * adapter form. The shim assumes server-side sorting/filtering/pagination
 * (matches 0.2.x ServerDataSource behavior) and uses `row['id']` as the
 * fallback identity.
 *
 * Removed in 0.3.0 along with `ServerDataSource`.
 */

import type {
  DataTableAdapter,
  DataTableRow,
  ServerDataSource,
} from './types.js';

/**
 * True when the argument matches the `DataTableAdapter` contract.
 *
 * Discrimination: an adapter has `getRowId`, `capabilities`, AND
 * `fetchPage` as functions; a `ServerDataSource` only has `fetchData`;
 * an array has none.
 */
export function isDataTableAdapter<T extends DataTableRow>(
  data: unknown,
): data is DataTableAdapter<T> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  const candidate = data as Partial<DataTableAdapter<T>>;
  return (
    typeof candidate.getRowId === 'function' &&
    typeof candidate.capabilities === 'function' &&
    typeof candidate.fetchPage === 'function'
  );
}

/**
 * True when the argument matches the deprecated `ServerDataSource` contract.
 */
export function isServerDataSource<T extends DataTableRow>(
  data: unknown,
): data is ServerDataSource<T> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  const candidate = data as Partial<ServerDataSource<T>>;
  return typeof candidate.fetchData === 'function' &&
    // Not a full adapter (those also have capabilities/getRowId/fetchPage).
    !isDataTableAdapter<T>(data);
}

/**
 * Lift a legacy `ServerDataSource<T>` into `DataTableAdapter<T>`.
 *
 * The shim:
 *   - Declares full server capability (sort/filter/search/pagination) —
 *     matches 0.2.x behavior where `ServerDataSource.fetchData` received
 *     all four query dimensions and the consumer handled them server-side.
 *   - Derives row identity via `row['id']` (the 0.2.x hardcoded default;
 *     `DataTableConfig.getRowId` still overrides this at the hook level).
 *   - Forwards `query.sort`, `query.filters`, `query.globalSearch` to the
 *     corresponding `ServerFetchParams` fields verbatim.
 *   - Drops cursor pagination (ServerDataSource was offset-only). Adapters
 *     that need cursors must implement `DataTableAdapter` directly.
 *
 * @deprecated Used internally until `ServerDataSource` is removed in 0.3.0.
 */
export function adaptLegacy<T extends DataTableRow>(
  source: ServerDataSource<T>,
): DataTableAdapter<T> {
  // Per-shim WeakMap assigning stable synthetic ids to rows whose `id`
  // field is null/undefined. Returning an empty string or a shared
  // sentinel (e.g. 'unknown') would collide every null-id row into the
  // same selection key — a bulk-delete on one null-id row would target
  // every null-id row. The WeakMap key is the row object identity, so
  // two rows with identical fields but different object identities still
  // get distinct synthetic ids (which is what the 0.2.x behavior gave
  // when the engine fell back to row index).
  const syntheticIds = new WeakMap<object, string>();
  let syntheticCounter = 0;
  return {
    getRowId: (row: T): string => {
      const id = (row as Record<string, unknown>)['id'];
      if (id != null) return String(id);
      // Row has no id — assign a stable synthetic one. WeakMap doesn't
      // prevent GC of the row object, so there's no leak.
      const existing = syntheticIds.get(row as object);
      if (existing !== undefined) return existing;
      const synthetic = `__legacy_${String(syntheticCounter++)}__`;
      syntheticIds.set(row as object, synthetic);
      return synthetic;
    },
    capabilities: () => ({
      // Legacy sources declared nothing explicit, so the safest default is
      // to assume everything-is-server-side — matches 0.2.x behavior.
      serverPagination: true,
      paginationMode: 'offset',
      // sortableFields / filterableFields left undefined — legacy contract
      // was "server handles whatever you send," not a declared allowlist.
      // Leaving undefined means the engine forwards every sort/filter even
      // if the backend can't handle it (same as 0.2.x).
      globalSearch: true,
    }),
    fetchPage: async (query) => {
      const result = await source.fetchData({
        page: query.page,
        pageSize: query.pageSize,
        sort: [...query.sort],
        filters: { ...query.filters },
        globalSearch: query.globalSearch,
        ...(query.signal !== undefined ? { signal: query.signal } : {}),
      });
      return {
        rows: result.items,
        totalCount:
          typeof result.totalCount === 'number' && result.totalCount >= 0
            ? result.totalCount
            : result.items.length,
      };
    },
  };
}

/**
 * Resolve any `DataTableConfig.data` value into a `DataTableAdapter<T>` plus
 * the classification flag needed for the hook's client-side fallback paths.
 *
 * Returns `{ adapter: null, clientData: T[] }` for plain arrays so the hook
 * can keep its existing client-side sort/filter/paginate code path.
 */
export function resolveDataSource<T extends DataTableRow>(
  data: T[] | ServerDataSource<T> | DataTableAdapter<T>,
): { adapter: DataTableAdapter<T> | null; clientData: T[] } {
  if (Array.isArray(data)) {
    return { adapter: null, clientData: data };
  }
  if (isDataTableAdapter<T>(data)) {
    return { adapter: data, clientData: [] };
  }
  if (isServerDataSource<T>(data)) {
    return { adapter: adaptLegacy(data), clientData: [] };
  }
  // Unrecognised object shape — treat as empty array for safety; the
  // boundary validation should surface this earlier but we never render
  // stale rows.
  return { adapter: null, clientData: [] };
}
