/**
 * CardGrid Organism
 * Spec: specs/components/card-grid.yaml
 *
 * Responsive grid of card elements with configurable columns per breakpoint.
 * Container is role="list" with each child rendered in a role="listitem"
 * wrapper for screen-reader navigation.
 */

import { type ReactNode, type CSSProperties } from 'react';

export interface ResponsiveColumns {
  /** Columns at ≤767px (mobile). Default: 1. */
  mobile?: number;
  /** Columns at 768-1023px (tablet). Default: 2. */
  tablet?: number;
  /** Columns at 1024-1439px (desktop). Default: 3. */
  desktop?: number;
  /** Columns at ≥1440px (wide). Default: 4. */
  wide?: number;
}

export interface CardGridProps {
  /** Card elements to display. Each child is wrapped in a listitem. */
  children: ReactNode;
  /** Number of columns at each breakpoint. */
  columns?: ResponsiveColumns;
  /** Gap between cards in logical pixels. Default: 16. */
  gap?: number;
  /** Accessible label describing the grid content. */
  'aria-label'?: string;
  /** Additional CSS class for composition. */
  className?: string;
  /** Empty-state node rendered when `children` is empty. */
  emptyState?: ReactNode;
}

const DEFAULT_COLUMNS: Required<ResponsiveColumns> = {
  mobile: 1,
  tablet: 2,
  desktop: 3,
  wide: 4,
};

const BREAKPOINTS = {
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

export function CardGrid({
  children,
  columns,
  gap = 16,
  'aria-label': ariaLabel,
  className,
  emptyState,
}: CardGridProps) {
  // Coerce each column count to a non-negative integer before interpolation
  // into CSS. TypeScript enforces `number` at the type boundary, but the
  // engine is consumed from JS too where `any` callers could slip a
  // CSS-injection payload through. Defense-in-depth: coerce via truncation
  // + Math.max(0, …), then interpolate. Non-finite inputs fall back to the
  // breakpoint default.
  const coerceInt = (v: number | undefined, fallback: number): number => {
    if (v === undefined) return fallback;
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.trunc(n));
  };
  const cols = {
    mobile: coerceInt(columns?.mobile, DEFAULT_COLUMNS.mobile),
    tablet: coerceInt(columns?.tablet, DEFAULT_COLUMNS.tablet),
    desktop: coerceInt(columns?.desktop, DEFAULT_COLUMNS.desktop),
    wide: coerceInt(columns?.wide, DEFAULT_COLUMNS.wide),
  };

  // Stable class name for the grid so the media queries below can target
  // THIS grid specifically instead of every grid on the page. Derived from
  // the coerced column counts (all integers), so two identical CardGrids
  // share the same rules (CSSOM dedup) without conflicting with a
  // differently-configured grid.
  const configKey = `${String(cols.mobile)}-${String(cols.tablet)}-${String(cols.desktop)}-${String(cols.wide)}`;
  const gridClassName = `prism-card-grid prism-card-grid-${configKey}`;
  const combinedClassName = className ? `${gridClassName} ${className}` : gridClassName;

  // Detect empty children — an empty array, null, undefined, false all count.
  // React doesn't render null/false/undefined but we still need to surface
  // the empty state when ALL children degrade.
  const childrenArray = Array.isArray(children)
    ? children.filter(c => c != null && c !== false && c !== '')
    : children != null && children !== false && children !== ''
      ? [children]
      : [];

  if (childrenArray.length === 0 && emptyState !== undefined) {
    return (
      <div
        role="region"
        aria-label={ariaLabel ?? 'No items'}
        className={className}
      >
        {emptyState}
      </div>
    );
  }

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${String(cols.mobile)}, 1fr)`,
    gap: `${String(gap)}px`,
    listStyle: 'none',
    margin: 0,
    padding: 0,
  };

  return (
    <>
      <ul
        role="list"
        aria-label={ariaLabel}
        className={combinedClassName}
        style={style}
      >
        {childrenArray.map((child, index) => (
          <li
            key={(child as { key?: string })?.key ?? index}
            role="listitem"
            style={{ listStyle: 'none', display: 'flex' }}
          >
            {child}
          </li>
        ))}
      </ul>
      <style>{`
        @media (min-width: ${String(BREAKPOINTS.tablet)}px) {
          .prism-card-grid-${configKey} {
            grid-template-columns: repeat(${String(cols.tablet)}, 1fr) !important;
          }
        }
        @media (min-width: ${String(BREAKPOINTS.desktop)}px) {
          .prism-card-grid-${configKey} {
            grid-template-columns: repeat(${String(cols.desktop)}, 1fr) !important;
          }
        }
        @media (min-width: ${String(BREAKPOINTS.wide)}px) {
          .prism-card-grid-${configKey} {
            grid-template-columns: repeat(${String(cols.wide)}, 1fr) !important;
          }
        }
        .prism-card-grid > li > * {
          width: 100%;
        }
      `}</style>
    </>
  );
}
