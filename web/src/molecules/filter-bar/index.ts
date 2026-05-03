/**
 * FilterBar molecule — barrel exports.
 *
 * The FilterBar molecule itself (filter-bar.tsx) lands in shard M03.
 * This shard (M02) ships the typed state hook only.
 *
 * Spec: docs/specs/03-component-contracts.md (filter-bar contract — landed M04)
 * Issue: terrene-foundation/kailash-prism#24
 */

export {
  useFilterBarState,
  type UseFilterBarStateInput,
  type UseFilterBarStateResult,
} from "./use-filter-bar-state.js";
