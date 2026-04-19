/**
 * Row — horizontal Stack.
 * Spec: docs/specs/04-layout-grammar.md § 4.1.2
 *
 * Thin wrapper: `<Row>` ≡ `<Stack direction="horizontal">`. Kept as a
 * standalone export so consumers can write intent-revealing JSX without
 * boilerplate (`<Row justify="between">` reads better than
 * `<Stack direction="horizontal" justify="between">`).
 */

import { forwardRef } from 'react';
import { Stack } from './stack.js';
import type { RowProps } from './types.js';

export const Row = forwardRef<HTMLDivElement, RowProps>(function Row(props, ref) {
  return <Stack ref={ref} {...props} direction="horizontal" />;
});
