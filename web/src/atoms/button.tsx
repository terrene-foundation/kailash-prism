/**
 * Button Atom
 * Spec: specs/components/button.yaml
 *
 * Primary interactive element. Consumes design tokens for all visual values.
 */

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const SIZE_MAP: Record<ButtonSize, { height: number; padding: string; fontSize: string }> = {
  sm: { height: 32, padding: '0 12px', fontSize: 'var(--prism-font-size-caption, 12px)' },
  md: { height: 40, padding: '0 16px', fontSize: 'var(--prism-font-size-body, 14px)' },
  lg: { height: 44, padding: '0 20px', fontSize: 'var(--prism-font-size-body, 14px)' },
};

const VARIANT_MAP: Record<ButtonVariant, { bg: string; color: string; border: string; hoverBg: string }> = {
  primary: {
    bg: 'var(--prism-color-interactive-primary, #1E3A5F)',
    color: 'var(--prism-color-text-on-primary, #FFFFFF)',
    border: 'none',
    hoverBg: 'var(--prism-color-interactive-primary-hover, #152C49)',
  },
  secondary: {
    bg: 'transparent',
    color: 'var(--prism-color-interactive-primary, #1E3A5F)',
    border: '1px solid var(--prism-color-interactive-primary, #1E3A5F)',
    hoverBg: 'var(--prism-color-interactive-primary-subtle, #EFF6FF)',
  },
  tertiary: {
    bg: 'transparent',
    color: 'var(--prism-color-interactive-primary, #1E3A5F)',
    border: '1px solid var(--prism-color-border-default, #E2E8F0)',
    hoverBg: 'var(--prism-color-surface-elevated, #F1F5F9)',
  },
  destructive: {
    bg: 'var(--prism-color-status-error, #DC2626)',
    color: '#FFFFFF',
    border: 'none',
    hoverBg: '#B91C1C',
  },
  ghost: {
    bg: 'transparent',
    color: 'var(--prism-color-text-primary, #0F172A)',
    border: 'none',
    hoverBg: 'var(--prism-color-surface-elevated, #F1F5F9)',
  },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', children, loading = false, iconLeft, iconRight, disabled, className, style: styleProp, ...rest },
  ref,
) {
  const sizeTokens = SIZE_MAP[size];
  const variantTokens = VARIANT_MAP[variant];
  const isDisabled = disabled || loading;

  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: sizeTokens.height,
    padding: sizeTokens.padding,
    fontSize: sizeTokens.fontSize,
    fontWeight: 500,
    fontFamily: 'inherit',
    borderRadius: 'var(--prism-radius-md, 6px)',
    backgroundColor: variantTokens.bg,
    color: variantTokens.color,
    border: variantTokens.border,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: 'background-color 150ms, opacity 150ms',
    whiteSpace: 'nowrap',
    ...styleProp,
  };

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={className}
      style={style}
      onMouseEnter={(e) => {
        if (!isDisabled) e.currentTarget.style.backgroundColor = variantTokens.hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = variantTokens.bg;
      }}
      {...rest}
    >
      {loading && <span aria-hidden="true" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>}
      {!loading && iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});
