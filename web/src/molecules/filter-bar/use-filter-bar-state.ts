/**
 * useFilterBarState — Typed state hook for FilterBar molecule.
 *
 * Owns FilterBar's search + filter dimensions and absorbs two recurring
 * consumer patterns as molecule-internal properties:
 *
 *   1. Derive filter options from data (3+ consumers): walk the dataset,
 *      collect unique values for one field, sort, prepend "All".
 *   2. Effective-filter fallback (2+ consumers): when the active filter
 *      value is no longer present in the derived option set (e.g. last
 *      item of a category was deleted), silently fall through to the
 *      `initial[key]` value without writing the raw state.
 *
 * Both behaviours come "for free" from one hook call so consumers stop
 * hand-rolling ~20 LOC of `Set` + sort + `["All", ...]` boilerplate AND
 * stop forgetting the fallback (which manifests as a stuck-empty page).
 *
 * Spec: workspaces/prism-0.6.0/01-analysis/01-issue-24-filterbar-evidence.md
 *       § "FilterBar API shape"
 * Journal: workspaces/prism-0.6.0/journal/0002-DISCOVERY-filterbar-absorbs-derived-options-and-effective-fallback.md
 * Issue: terrene-foundation/kailash-prism#24
 */

import { useCallback, useMemo, useState } from "react";

/**
 * Input to {@link useFilterBarState}.
 *
 * @typeParam T — Row shape of the data the FilterBar filters over.
 * @typeParam TFilters — Map of dimension keys to their selected (string)
 *   values. Every key MUST have an `initial` value; that value is also
 *   the fallback used when the raw state drifts off the derived options.
 */
export interface UseFilterBarStateInput<
  T,
  TFilters extends Record<string, string>,
> {
  /** Source data for derivation. Hook re-derives options when this changes. */
  data: T[];
  /**
   * Initial value per filter dimension. Doubles as the effective-fallback
   * value when raw state drifts off the derived option set.
   */
  initial: TFilters;
  /** Initial search query. Default: "". */
  searchInitial?: string;
  /**
   * Optional per-dimension derivation callback. When provided, the hook
   * walks `data`, collects unique returned values, dedupes, sorts, and
   * prepends `"All"` if not already present. Dimensions without a `derive`
   * entry get `options[key] = []` — the consumer is responsible for
   * passing options manually to the FilterBar molecule (or rendering a
   * hardcoded option list).
   */
  derive?: { [K in keyof TFilters]?: (rows: T[]) => string[] };
}

/**
 * Result of {@link useFilterBarState}.
 *
 * `filters` exposes the EFFECTIVE values (with fallback applied). The raw
 * setter `setFilter` writes whatever the consumer passes; on the next
 * read, if the raw value is not in the derived option set for that
 * dimension, the hook falls back to `initial[key]`.
 *
 * @typeParam T — Row shape (declared for symmetry with input; not
 *   referenced in the result surface).
 * @typeParam TFilters — Map of dimension keys to their string values.
 */
export interface UseFilterBarStateResult<
  T,
  TFilters extends Record<string, string>,
> {
  /** Current search query (raw — no fallback semantics). */
  search: string;
  /** Set the search query. */
  setSearch: (v: string) => void;
  /**
   * EFFECTIVE filter values. For each key, this is the raw value if it
   * appears in `options[key]`, else `initial[key]` (the fallback). The
   * raw setter `setFilter` writes raw values; effective recomputes on
   * the next render via the memo.
   */
  filters: TFilters;
  /** Set a single filter dimension to a raw value. */
  setFilter: <K extends keyof TFilters>(k: K, v: string) => void;
  /**
   * Derived option lists per dimension. If a dimension has no `derive`
   * callback in the input, its options array is `[]`.
   */
  options: { [K in keyof TFilters]: string[] };
  /**
   * Phantom field carrying the row type `T` so the result interface
   * preserves it as a public type parameter (mirroring
   * `UseFilterBarStateInput<T, TFilters>`). Always materialised as
   * `undefined` on the returned object so `("__rowType" in result)`
   * returns `true` and the type/runtime contracts agree.
   */
  readonly __rowType?: T | undefined;
}

/**
 * Sort + dedupe + prepend "All" if not already present.
 * Pure helper; exported only via the hook (kept module-private).
 */
function withAllPrefix(values: readonly string[]): string[] {
  const unique = Array.from(new Set(values));
  unique.sort();
  if (!unique.includes("All")) {
    return ["All", ...unique];
  }
  return unique;
}

/**
 * Typed state hook for FilterBar. See module docstring for behaviour.
 *
 * @example Basic — derive sector options from a clients dataset.
 * ```ts
 * const state = useFilterBarState<Client, { sector: string }>({
 *   data: clients,
 *   initial: { sector: "All" },
 *   derive: { sector: (rows) => rows.map((r) => r.sector) },
 * });
 * // state.options.sector === ["All", "Finance", "Health", ...]
 * // state.filters.sector === effective value (with fallback to "All")
 * ```
 */
export function useFilterBarState<T, TFilters extends Record<string, string>>(
  input: UseFilterBarStateInput<T, TFilters>,
): UseFilterBarStateResult<T, TFilters> {
  const { data, initial, searchInitial, derive } = input;

  // Search state — raw, no fallback semantics.
  const [search, setSearch] = useState<string>(searchInitial ?? "");

  // Raw filter state — what the consumer most recently set. Effective
  // values (with fallback applied) are computed in `filters` below.
  const [rawFilters, setRawFilters] = useState<TFilters>(initial);

  // Derived options per dimension. Keyed on `data` identity AND the
  // shape of the `derive` map (in case a consumer swaps callbacks at
  // runtime, which is rare but well-defined).
  const options = useMemo<{ [K in keyof TFilters]: string[] }>(() => {
    const out = {} as { [K in keyof TFilters]: string[] };
    // Iterate over every declared dimension key (from `initial`), so
    // dimensions without a `derive` callback still get an empty array.
    for (const k of Object.keys(initial) as Array<keyof TFilters>) {
      const fn = derive?.[k];
      if (fn) {
        out[k] = withAllPrefix(fn(data));
      } else {
        out[k] = [];
      }
    }
    return out;
    // `initial` is in the dep list because its key set defines the
    // dimensions we derive for. In practice consumers pass a stable
    // object literal; if they don't, the memo recomputes — which is
    // the desired behaviour.
  }, [data, derive, initial]);

  // Effective filter values — for each key, raw value if it's in the
  // derived options, else `initial[key]`. When `options[key]` is empty
  // (no derive callback), we cannot validate the raw value, so we use
  // it as-is — the consumer owns the option list in that case.
  const filters = useMemo<TFilters>(() => {
    const effective = { ...rawFilters } as TFilters;
    for (const k of Object.keys(initial) as Array<keyof TFilters>) {
      // `noUncheckedIndexedAccess` makes these `string[] | undefined`
      // and `string | undefined`, but every key here came from
      // `Object.keys(initial)`, so both lookups are defined by
      // construction. Keep the explicit guards rather than `!` so any
      // future shape change fails loudly.
      const opts = options[k];
      const raw = rawFilters[k];
      if (opts === undefined || raw === undefined) {
        continue;
      }
      if (opts.length > 0 && !opts.includes(raw)) {
        effective[k] = initial[k];
      }
    }
    return effective;
  }, [rawFilters, options, initial]);

  // Stable setter — writes to raw state; effective recomputes via memo.
  const setFilter = useCallback(<K extends keyof TFilters>(k: K, v: string) => {
    setRawFilters((prev) => ({ ...prev, [k]: v }));
  }, []);

  return {
    search,
    setSearch,
    filters,
    setFilter,
    options,
    __rowType: undefined,
  };
}
