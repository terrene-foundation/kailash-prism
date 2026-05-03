/**
 * FilterBar molecule — barrel exports.
 *
 * Two surfaces ship together as of 0.6.0:
 *   - {@link useFilterBarState} (M02): typed state hook with derivation +
 *     effective-fallback semantics.
 *   - {@link FilterBar} (M03): horizontal molecule rendering search +
 *     dimensions + view-mode toggle.
 *
 * Spec: docs/specs/03-component-contracts.md (filter-bar contract — landed M04)
 * Issue: terrene-foundation/kailash-prism#24
 */

export {
  useFilterBarState,
  type UseFilterBarStateInput,
  type UseFilterBarStateResult,
} from "./use-filter-bar-state.js";

export {
  FilterBar,
  type FilterBarProps,
  type FilterBarDimension,
  type FilterBarViewMode,
} from "./filter-bar.js";
