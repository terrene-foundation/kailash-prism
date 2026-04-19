/**
 * Layout Engine — barrel export
 * Spec: docs/specs/04-layout-grammar.md, docs/specs/05-engine-specifications.md § 5.4
 *
 * Six composable primitives:
 *   Stack  — vertical or horizontal arrangement
 *   Row    — Stack direction="horizontal" (intent-revealing alias)
 *   Grid   — N-column responsive grid
 *   Split  — two-panel resizable layout (mouse + keyboard + touch)
 *   Layer  — absolutely-positioned overlay with tier-based z-index
 *   Scroll — overflow container with token-driven styled scrollbar
 *
 * All values (spacing, z-index, color) resolve through design tokens
 * (`var(--prism-*, <fallback>)`). No hardcoded px/hex values.
 */

export { Stack } from './stack.js';
export { Row } from './row.js';
export { Grid } from './grid.js';
export { Split } from './split.js';
export { Layer } from './layer.js';
export { Scroll } from './scroll.js';

export {
  spacingVar,
  SPACING_TOKEN_FALLBACK,
  LAYER_Z_INDEX_FALLBACK,
  type SpacingToken,
  type LayoutProps,
  type Breakpoint,
  type ResponsiveColumns,
  // Stack
  type StackProps,
  type StackDirection,
  type StackAlign,
  type StackJustify,
  // Row
  type RowProps,
  // Grid
  type GridProps,
  // Split
  type SplitProps,
  type SplitDirection,
  // Layer
  type LayerProps,
  type LayerTier,
  type LayerPosition,
  // Scroll
  type ScrollProps,
  type ScrollDirection,
} from './types.js';
