/**
 * Badge Atom
 * Spec: specs/components/badge.yaml
 *
 * Small status indicator or count label.
 */

import type { CSSProperties, ReactNode } from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

const VARIANT_MAP: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: 'var(--prism-color-surface-elevated, #F1F5F9)', color: 'var(--prism-color-text-secondary, #64748B)' },
  primary: { bg: 'var(--prism-color-interactive-primary, #1E3A5F)', color: 'var(--prism-color-text-on-primary, #FFFFFF)' },
  success: { bg: 'var(--prism-color-surface-success, #F0FDF4)', color: 'var(--prism-color-status-success, #16A34A)' },
  warning: { bg: '#FEF3C7', color: 'var(--prism-color-status-warning, #D97706)' },
  error: { bg: 'var(--prism-color-surface-error, #FEF2F2)', color: 'var(--prism-color-status-error, #DC2626)' },
  info: { bg: '#EFF6FF', color: 'var(--prism-color-status-info, #2563EB)' },
};

export function Badge({ children, variant = 'default', size = 'sm', dot = false, className }: BadgeProps) {
  const tokens = VARIANT_MAP[variant];

  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: dot ? '0' : size === 'sm' ? '2px 6px' : '2px 8px',
    minWidth: dot ? 8 : size === 'sm' ? 18 : 22,
    height: dot ? 8 : size === 'sm' ? 18 : 22,
    borderRadius: 9999,
    fontSize: size === 'sm' ? 11 : 12,
    fontWeight: 500,
    backgroundColor: tokens.bg,
    color: tokens.color,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };

  if (dot) {
    return <span className={className} style={style} aria-hidden="true" />;
  }

  return <span className={className} style={style}>{children}</span>;
}
