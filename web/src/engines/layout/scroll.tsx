/**
 * Scroll — overflow container with token-driven styled scrollbar.
 * Spec: docs/specs/04-layout-grammar.md § 4.1.6
 *
 * The scrollbar is styled via token-driven CSS custom properties so a
 * theme can re-skin it without touching the component. Per-instance scoped
 * via a unique `data-prism-scroll` attribute to avoid leaking the
 * `::-webkit-scrollbar` rules to siblings.
 *
 * Conservative: virtualization is NOT wired here. Per spec § 4.1.6 the
 * virtualize path delegates to `@tanstack/react-virtual` — already a
 * project dependency — but integrating it requires a row-renderer
 * contract that's out of scope for this shard. This primitive handles
 * the overflow container only; consumers who need virtualization
 * compose with the DataTable engine (which already virtualizes).
 */

import { forwardRef, useId, useMemo, type CSSProperties } from 'react';
import {
  spacingVar,
  type ScrollProps,
  type SpacingToken,
} from './types.js';

const SPACING_TOKEN_VALUES: ReadonlyArray<SpacingToken> = [
  'none',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
];

function isSpacingToken(v: unknown): v is SpacingToken {
  return typeof v === 'string' && (SPACING_TOKEN_VALUES as readonly string[]).includes(v);
}

function resolveDimension(v: number | string | SpacingToken | undefined): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v === 'number') return `${v}px`;
  if (isSpacingToken(v)) return spacingVar(v);
  return v;
}

export const Scroll = forwardRef<HTMLDivElement, ScrollProps>(function Scroll(
  {
    children,
    direction = 'vertical',
    maxHeight,
    maxWidth,
    padding = 'none',
    className,
    'aria-label': ariaLabel,
    'data-testid': dataTestId,
    style: styleProp,
  },
  ref,
) {
  const instanceId = useId().replace(/[:]/g, '-');
  const scopeAttr = `prism-scroll-${instanceId}`;

  const overflowY = direction === 'vertical' || direction === 'both' ? 'auto' : 'hidden';
  const overflowX = direction === 'horizontal' || direction === 'both' ? 'auto' : 'hidden';

  const style: CSSProperties = {
    overflowY,
    overflowX,
    maxHeight: resolveDimension(maxHeight),
    maxWidth: resolveDimension(maxWidth),
    padding: spacingVar(padding),
    // Enable smooth momentum scrolling on mobile WebKit. Widely supported
    // as `-webkit-overflow-scrolling: touch` — typed via CSS.supports at
    // runtime would be heavier than just emitting the legacy property.
    WebkitOverflowScrolling: 'touch',
    // Firefox scrollbar token hooks.
    scrollbarColor:
      'var(--prism-scrollbar-thumb, #CBD5E1) var(--prism-scrollbar-track, transparent)',
    scrollbarWidth: 'thin',
    minWidth: 0,
    minHeight: 0,
    ...styleProp,
  };

  // WebKit scrollbar rules are scoped per instance via data attr so they
  // don't affect sibling scroll regions. The CSS custom props make the
  // thumb/track fully themable.
  const scopedScrollbarCSS = useMemo(
    () => `
[data-prism-scroll="${scopeAttr}"]::-webkit-scrollbar {
  width: var(--prism-scrollbar-size, 10px);
  height: var(--prism-scrollbar-size, 10px);
}
[data-prism-scroll="${scopeAttr}"]::-webkit-scrollbar-track {
  background: var(--prism-scrollbar-track, transparent);
}
[data-prism-scroll="${scopeAttr}"]::-webkit-scrollbar-thumb {
  background: var(--prism-scrollbar-thumb, #CBD5E1);
  border-radius: var(--prism-scrollbar-radius, 4px);
}
[data-prism-scroll="${scopeAttr}"]::-webkit-scrollbar-thumb:hover {
  background: var(--prism-scrollbar-thumb-hover, #94A3B8);
}
`,
    [scopeAttr],
  );

  return (
    <>
      <style>{scopedScrollbarCSS}</style>
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        className={className}
        data-testid={dataTestId}
        data-prism-scroll={scopeAttr}
        data-prism-scroll-direction={direction}
        style={style}
      >
        {children}
      </div>
    </>
  );
});
