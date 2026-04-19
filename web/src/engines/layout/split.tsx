/**
 * Split — two-panel layout with a draggable divider.
 * Spec: docs/specs/04-layout-grammar.md § 4.1.4
 *
 * Supports mouse, touch, and keyboard interaction:
 *   - pointer (mouse+touch): pointerdown on divider → pointermove ratchets ratio
 *   - keyboard: Left/Right (horizontal) or Up/Down (vertical) adjust by 5%,
 *     Home/End snap to min/max, PageUp/PageDown adjust by 20%.
 * Container size is read via `getBoundingClientRect()` during drag so
 * ratio math is resilient to resized containers. Keyboard step of 5%
 * matches the common editor-split convention.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  Children,
} from 'react';
import type { SplitProps } from './types.js';

const KEYBOARD_STEP = 0.05;
const PAGE_STEP = 0.2;
const clampRatio = (v: number, min: number) => Math.max(min, Math.min(1 - min, v));

export const Split = forwardRef<HTMLDivElement, SplitProps>(function Split(
  {
    children,
    direction = 'horizontal',
    defaultRatio = 0.5,
    minSize = 80,
    resizable = true,
    'aria-label': ariaLabel = 'Resize panels',
    className,
    'data-testid': dataTestId,
    style: styleProp,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState(() => clampRatio(defaultRatio, 0));
  const [dragging, setDragging] = useState(false);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Resolve minimum ratio dynamically — minSize in px translated to
  // a fraction of the current container size.
  const computeMinRatio = useCallback((): number => {
    const el = containerRef.current;
    if (!el) return 0;
    const total = direction === 'horizontal' ? el.clientWidth : el.clientHeight;
    if (total <= 0) return 0;
    return Math.min(0.5, minSize / total);
  }, [direction, minSize]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!resizable) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
    },
    [resizable],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setDragging(false);
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const pos =
        direction === 'horizontal'
          ? (e.clientX - rect.left) / rect.width
          : (e.clientY - rect.top) / rect.height;
      setRatio(clampRatio(pos, computeMinRatio()));
    },
    [dragging, direction, computeMinRatio],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!resizable) return;
      const minRatio = computeMinRatio();
      const forward = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
      const backward = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      let next = ratio;
      if (e.key === forward) next = ratio + KEYBOARD_STEP;
      else if (e.key === backward) next = ratio - KEYBOARD_STEP;
      else if (e.key === 'PageUp') next = ratio - PAGE_STEP;
      else if (e.key === 'PageDown') next = ratio + PAGE_STEP;
      else if (e.key === 'Home') next = minRatio;
      else if (e.key === 'End') next = 1 - minRatio;
      else return;
      e.preventDefault();
      setRatio(clampRatio(next, minRatio));
    },
    [direction, resizable, ratio, computeMinRatio],
  );

  // When defaultRatio prop changes (uncommon), keep local state fresh.
  useEffect(() => {
    setRatio(clampRatio(defaultRatio, 0));
  }, [defaultRatio]);

  const kids = Children.toArray(children);
  const first = kids[0];
  const second = kids[kids.length - 1 > 0 ? kids.length - 1 : 0];

  const isHorizontal = direction === 'horizontal';
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
    ...styleProp,
  };

  const firstPanelStyle: CSSProperties = {
    flex: `0 0 ${(ratio * 100).toFixed(4)}%`,
    minWidth: 0,
    minHeight: 0,
    overflow: 'auto',
  };
  const secondPanelStyle: CSSProperties = {
    flex: '1 1 0%',
    minWidth: 0,
    minHeight: 0,
    overflow: 'auto',
  };

  const dividerStyle: CSSProperties = {
    flex: '0 0 auto',
    backgroundColor: 'var(--prism-color-border-default, #E2E8F0)',
    cursor: resizable ? (isHorizontal ? 'col-resize' : 'row-resize') : 'default',
    width: isHorizontal ? 'var(--prism-split-divider-size, 4px)' : undefined,
    height: isHorizontal ? undefined : 'var(--prism-split-divider-size, 4px)',
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <div
      ref={setRefs}
      className={className}
      data-testid={dataTestId}
      data-prism-split={direction}
      style={containerStyle}
    >
      <div data-prism-split-panel="first" style={firstPanelStyle}>
        {first}
      </div>
      <div
        role="separator"
        aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(ratio * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
        tabIndex={resizable ? 0 : -1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        style={dividerStyle}
      />
      {kids.length > 1 && (
        <div data-prism-split-panel="second" style={secondPanelStyle}>
          {second}
        </div>
      )}
    </div>
  );
});
