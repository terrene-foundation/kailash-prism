/**
 * Stack — arranges children along one axis with token-driven spacing.
 * Spec: docs/specs/04-layout-grammar.md § 4.1.1 (VStack) + § 4.1.2 (Row).
 *
 * Conservative interpretation: the spec canonicalises `VStack` (vertical) and
 * `Row` (horizontal) as two primitives. This engine exposes them as one
 * primitive (`Stack`) parameterised by `direction`, matching the task brief.
 * `Row` is a thin alias (`direction="horizontal"`) declared in `row.tsx`.
 */

import { forwardRef, type CSSProperties } from 'react';
import {
  spacingVar,
  type StackAlign,
  type StackDirection,
  type StackJustify,
  type StackProps,
} from './types.js';

const ALIGN_MAP: Record<StackAlign, CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY_MAP: Record<StackJustify, CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

const DIRECTION_MAP: Record<StackDirection, CSSProperties['flexDirection']> = {
  vertical: 'column',
  horizontal: 'row',
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    children,
    direction = 'vertical',
    spacing = 'md',
    align = 'stretch',
    justify = 'start',
    wrap = false,
    className,
    'data-testid': dataTestId,
    style: styleProp,
  },
  ref,
) {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: DIRECTION_MAP[direction],
    gap: spacingVar(spacing),
    alignItems: ALIGN_MAP[align],
    justifyContent: JUSTIFY_MAP[justify],
    flexWrap: wrap ? 'wrap' : 'nowrap',
    minWidth: 0,
    ...styleProp,
  };

  return (
    <div
      ref={ref}
      className={className}
      data-testid={dataTestId}
      data-prism-stack={direction}
      style={style}
    >
      {children}
    </div>
  );
});
