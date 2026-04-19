/**
 * Grid — N-column grid with responsive column counts.
 * Spec: docs/specs/04-layout-grammar.md § 4.1.3
 *
 * Responsive `columns` uses a CSS-only mobile-first cascade via min-width
 * media queries emitted inline — no JS breakpoint detection required, which
 * keeps Grid SSR-safe and avoids hydration flashes. The inline `<style>`
 * scopes via a unique `data-prism-grid` attribute per instance.
 */

import { forwardRef, useId, type CSSProperties } from 'react';
import { spacingVar, type Breakpoint, type GridProps } from './types.js';

const BREAKPOINT_MIN_WIDTH: Record<Breakpoint, number> = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

function isResponsive(
  columns: GridProps['columns'],
): columns is Partial<Record<Breakpoint, number>> {
  return typeof columns === 'object' && columns !== null;
}

export const Grid = forwardRef<HTMLDivElement, GridProps>(function Grid(
  {
    children,
    columns = 1,
    gap = 'md',
    minChildWidth,
    className,
    'data-testid': dataTestId,
    style: styleProp,
  },
  ref,
) {
  const instanceId = useId().replace(/[:]/g, '-');
  const scopeAttr = `prism-grid-${instanceId}`;

  // When minChildWidth is set, it takes precedence over `columns`
  // (spec § 4.1.3). Auto-fill columns between minChildWidth and 1fr.
  const baseTemplate = minChildWidth
    ? `repeat(auto-fill, minmax(${minChildWidth}px, 1fr))`
    : `repeat(${typeof columns === 'number' ? columns : (columns.mobile ?? 1)}, minmax(0, 1fr))`;

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: baseTemplate,
    gap: spacingVar(gap),
    minWidth: 0,
    ...styleProp,
  };

  // Build mobile-first media queries for responsive columns. Each entry
  // overrides gridTemplateColumns at or above the breakpoint's min-width.
  // Order matters: emit in ascending min-width so later rules win.
  const mediaCSS: string[] = [];
  if (isResponsive(columns) && !minChildWidth) {
    const order: Breakpoint[] = ['tablet', 'desktop', 'wide'];
    for (const bp of order) {
      const cols = columns[bp];
      if (cols === undefined) continue;
      const px = BREAKPOINT_MIN_WIDTH[bp];
      mediaCSS.push(
        `@media (min-width: ${px}px) { [data-prism-grid="${scopeAttr}"] { grid-template-columns: repeat(${cols}, minmax(0, 1fr)); } }`,
      );
    }
  }

  return (
    <>
      {mediaCSS.length > 0 && <style>{mediaCSS.join('\n')}</style>}
      <div
        ref={ref}
        className={className}
        data-testid={dataTestId}
        data-prism-grid={scopeAttr}
        style={style}
      >
        {children}
      </div>
    </>
  );
});
