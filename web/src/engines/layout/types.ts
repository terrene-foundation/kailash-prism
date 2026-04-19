/**
 * Layout Engine — shared types
 * Spec: docs/specs/04-layout-grammar.md, docs/specs/05-engine-specifications.md § 5.4
 *
 * Six layout primitives compose all page structures. Each primitive is a
 * container that arranges its children according to a single layout algorithm.
 * All visual values (spacing, z-index, colors) come from design tokens —
 * no hardcoded px/hex values appear in this engine.
 *
 * Token discipline:
 *   All spacing/sizing/color/z-index values MUST resolve through CSS custom
 *   properties (e.g. `var(--prism-spacing-md, 16px)`). The fallback in the
 *   `var(...)` expression is the sole permitted literal — matching the
 *   convention established in `atoms/card.tsx`, `atoms/button.tsx` etc.
 */

import type { CSSProperties, ReactNode } from 'react';

/**
 * Semantic spacing token name. Maps to the canonical spacing scale (see
 * docs/specs/04-layout-grammar.md § 4.4.2). Resolved to CSS vars at render
 * time. The numeric form on the right is the fallback — present so that
 * consumers who haven't wired a ThemeProvider still get sensible spacing.
 */
export type SpacingToken = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export const SPACING_TOKEN_FALLBACK: Record<SpacingToken, number> = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

/** Resolve a SpacingToken to a CSS `var(--prism-spacing-*, fallback)` string. */
export function spacingVar(token: SpacingToken): string {
  return `var(--prism-spacing-${token}, ${SPACING_TOKEN_FALLBACK[token]}px)`;
}

/**
 * Shared layout props — every primitive accepts `className` and `children`
 * so consumers can compose freely. Matches the convention in
 * `web/src/atoms/card.tsx`.
 */
export interface LayoutProps {
  children?: ReactNode;
  className?: string | undefined;
  /** Passthrough for tests and downstream selectors. */
  'data-testid'?: string | undefined;
  /** Inline style passthrough — applied after token-driven defaults. */
  style?: CSSProperties | undefined;
}

// --- Stack ---------------------------------------------------------------

export type StackDirection = 'vertical' | 'horizontal';
export type StackAlign = 'start' | 'center' | 'end' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around';

export interface StackProps extends LayoutProps {
  /** Axis of arrangement. Default: "vertical". */
  direction?: StackDirection;
  /** Spacing token between children. Default: "md". */
  spacing?: SpacingToken;
  /** Alignment on the cross axis. Default: "stretch". */
  align?: StackAlign;
  /** Distribution on the main axis. Default: "start". */
  justify?: StackJustify;
  /** Wrap children to next line when the main axis overflows. */
  wrap?: boolean;
}

// --- Row -----------------------------------------------------------------

/** Row is a thin wrapper: `<Row>` ≡ `<Stack direction="horizontal">`. */
export type RowProps = Omit<StackProps, 'direction'>;

// --- Grid ----------------------------------------------------------------

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';
export type ResponsiveColumns = number | Partial<Record<Breakpoint, number>>;

export interface GridProps extends LayoutProps {
  /** Number of equal-width columns, or a per-breakpoint map. Default: 1. */
  columns?: ResponsiveColumns;
  /** Gap between cells. Default: "md". */
  gap?: SpacingToken;
  /** Minimum width per child in px. When set, columns are auto-filled. */
  minChildWidth?: number;
}

// --- Split ---------------------------------------------------------------

export type SplitDirection = 'horizontal' | 'vertical';

export interface SplitProps extends LayoutProps {
  /** Orientation of the divider. "horizontal" = side-by-side panels. */
  direction?: SplitDirection;
  /** Initial ratio of the first panel (0.0 - 1.0). Default: 0.5. */
  defaultRatio?: number;
  /** Minimum panel size in px (applies to both panels). Default: 80. */
  minSize?: number;
  /** Whether the divider can be dragged. Default: true. */
  resizable?: boolean;
  /** Accessible label for the divider. Default: "Resize panels". */
  'aria-label'?: string | undefined;
  /**
   * Exactly two children — left+right (horizontal) or top+bottom (vertical).
   * We type as `ReactNode` rather than `[ReactNode, ReactNode]` to remain
   * permissive with JSX authoring; the runtime picks first and last.
   */
  children: ReactNode;
}

// --- Layer ---------------------------------------------------------------

export type LayerTier = 'page' | 'popover' | 'modal' | 'toast' | 'tooltip';
export type LayerPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Per-tier z-index fallback. Matches docs/specs/04-layout-grammar.md § 4.1.5.
 * Runtime resolves via `var(--prism-layer-z-{tier}, <fallback>)` so a theme
 * can override tier ordering without touching component code.
 */
export const LAYER_Z_INDEX_FALLBACK: Record<LayerTier, number> = {
  page: 0,
  popover: 100,
  modal: 200,
  toast: 300,
  tooltip: 400,
};

export interface LayerProps extends LayoutProps {
  /** Positioning relative to the viewport. Default: "center". */
  position?: LayerPosition;
  /**
   * Z-index tier. Default: "page". Resolves to
   * `var(--prism-layer-z-{tier}, <fallback>)`.
   */
  tier?: LayerTier;
  /**
   * Explicit z-index token override. When supplied, overrides the tier.
   * Accepts a custom CSS var token name — e.g. `"prism-layer-z-custom"`.
   */
  zIndexToken?: string;
  /** Whether the layer is open. Default: true. */
  open?: boolean;
  /** Called when the Escape key is pressed while the layer is open. */
  onDismiss?: () => void;
}

// --- Scroll --------------------------------------------------------------

export type ScrollDirection = 'vertical' | 'horizontal' | 'both';

export interface ScrollProps extends LayoutProps {
  /** Scroll axis. Default: "vertical". */
  direction?: ScrollDirection;
  /**
   * Max height — number (px), string (e.g. "50vh"), or SpacingToken. The
   * vertical scroll axis needs a bound to activate; consumers typically
   * pass a number or a viewport-relative string.
   */
  maxHeight?: number | string | SpacingToken;
  /** Max width — same shape as maxHeight. */
  maxWidth?: number | string | SpacingToken;
  /** Inner padding. Default: "none". */
  padding?: SpacingToken;
  /** Accessible label for the scroll region. */
  'aria-label'?: string | undefined;
}
