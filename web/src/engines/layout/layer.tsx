/**
 * Layer — absolutely-positioned overlay with tier-based z-index.
 * Spec: docs/specs/04-layout-grammar.md § 4.1.5
 *
 * Positioning is via viewport-fixed anchoring (conservative default — spec
 * § 4.1.5 defaults anchor to "viewport"). Z-index resolves through the
 * tier token map: `var(--prism-layer-z-{tier}, <fallback>)`, matching the
 * convention already established in `atoms/card.tsx` for shadow tokens.
 *
 * Keyboard interaction: Escape fires `onDismiss` when supplied. Focus trap
 * is intentionally NOT built in here — that's a Modal-organism concern
 * (per spec § 4.1.5 "trapFocus MUST be true for modals" — which is the
 * Modal's responsibility, not Layer's).
 *
 * Conservative choice: when `open` is false, the layer renders nothing
 * (rather than `visibility: hidden`). This matches the legacy layout.tsx
 * Layer primitive and avoids DOM bloat for large toast stacks.
 */

import { forwardRef, useEffect, type CSSProperties } from 'react';
import {
  LAYER_Z_INDEX_FALLBACK,
  type LayerPosition,
  type LayerProps,
} from './types.js';

function positionStyle(position: LayerPosition): CSSProperties {
  switch (position) {
    case 'top-left':
      return { top: 'var(--prism-spacing-md, 16px)', left: 'var(--prism-spacing-md, 16px)' };
    case 'top-right':
      return { top: 'var(--prism-spacing-md, 16px)', right: 'var(--prism-spacing-md, 16px)' };
    case 'bottom-left':
      return { bottom: 'var(--prism-spacing-md, 16px)', left: 'var(--prism-spacing-md, 16px)' };
    case 'bottom-right':
      return { bottom: 'var(--prism-spacing-md, 16px)', right: 'var(--prism-spacing-md, 16px)' };
    case 'center':
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
  }
}

export const Layer = forwardRef<HTMLDivElement, LayerProps>(function Layer(
  {
    children,
    position = 'center',
    tier = 'page',
    zIndexToken,
    open = true,
    onDismiss,
    className,
    'data-testid': dataTestId,
    style: styleProp,
  },
  ref,
) {
  // Escape-key dismiss. Registered only when both `open` and `onDismiss` are
  // supplied so the layer doesn't steal Escape from unrelated consumers.
  useEffect(() => {
    if (!open || !onDismiss) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
    };
  }, [open, onDismiss]);

  if (!open) return null;

  const zIndexVar = zIndexToken
    ? `var(--${zIndexToken})`
    : `var(--prism-layer-z-${tier}, ${LAYER_Z_INDEX_FALLBACK[tier]})`;

  const style: CSSProperties = {
    position: 'fixed',
    zIndex: zIndexVar as unknown as number,
    ...positionStyle(position),
    ...styleProp,
  };

  return (
    <div
      ref={ref}
      className={className}
      data-testid={dataTestId}
      data-prism-layer={tier}
      data-prism-layer-position={position}
      style={style}
    >
      {children}
    </div>
  );
});
