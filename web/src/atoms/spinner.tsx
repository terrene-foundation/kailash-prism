/**
 * Spinner Atom
 * Spec: specs/components/spinner.yaml
 *
 * Loading indicator with accessible live region announcement.
 */

import type { CSSProperties } from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  label?: string;
  className?: string;
}

const SIZE_MAP: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 36 };

export function Spinner({ size = 'md', label = 'Loading', className }: SpinnerProps) {
  const px = SIZE_MAP[size];

  const style: CSSProperties = {
    display: 'inline-block',
    width: px,
    height: px,
    border: `${Math.max(2, px / 8)}px solid var(--prism-color-border-default, #E2E8F0)`,
    borderTopColor: 'var(--prism-color-interactive-primary, #1E3A5F)',
    borderRadius: 9999,
    animation: 'prism-spin 0.8s linear infinite',
  };

  return (
    <>
      <span
        role="status"
        aria-label={label}
        className={className}
        style={style}
      />
      <style>{`@keyframes prism-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
