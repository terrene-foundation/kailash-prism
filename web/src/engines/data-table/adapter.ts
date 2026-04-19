/**
 * DataTableAdapter utilities — type guard + resolver.
 *
 * Since 0.3.0 the engine accepts only two data shapes: plain arrays and
 * `DataTableAdapter<T>`. The legacy `ServerDataSource` shape was removed
 * in this release; if you need to port a pre-0.3.0 consumer, the 0.2.2
 * `adaptLegacy` shim is still available via `git show 8489bc9:web/src/engines/data-table/adapter.ts`
 * and can be copied ~30 LOC into your own code as a one-off migration helper.
 */

import type { DataTableAdapter, DataTableRow } from './types.js';

/**
 * True when the argument matches the `DataTableAdapter` contract.
 *
 * Discrimination: an adapter has `getRowId`, `capabilities`, AND
 * `fetchPage` as functions.
 */
export function isDataTableAdapter<T extends DataTableRow, TId = string>(
  data: unknown,
): data is DataTableAdapter<T, TId> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  const candidate = data as Partial<DataTableAdapter<T, TId>>;
  return (
    typeof candidate.getRowId === 'function' &&
    typeof candidate.capabilities === 'function' &&
    typeof candidate.fetchPage === 'function'
  );
}

/**
 * Resolve a `DataTableConfig.data` value into a `DataTableAdapter<T>` plus
 * the classification flag needed for the hook's client-side fallback paths.
 *
 * Returns `{ adapter: null, clientData: T[] }` for plain arrays so the hook
 * can keep its existing client-side sort/filter/paginate code path.
 */
export function resolveDataSource<T extends DataTableRow, TId = string>(
  data: T[] | DataTableAdapter<T, TId>,
): { adapter: DataTableAdapter<T, TId> | null; clientData: T[] } {
  if (Array.isArray(data)) {
    return { adapter: null, clientData: data };
  }
  if (isDataTableAdapter<T, TId>(data)) {
    return { adapter: data, clientData: [] };
  }
  // Unrecognised object shape — treat as empty array for safety. The
  // TypeScript boundary normally catches this at compile time; the
  // runtime fallback prevents a bad `data` prop from rendering stale
  // rows from a previous render.
  return { adapter: null, clientData: [] };
}
