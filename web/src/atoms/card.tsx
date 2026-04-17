/**
 * Card Atom
 * Spec: specs/components/card-grid.yaml (Card is the primary molecule CardGrid composes)
 *
 * A content container with optional media, title, body, and footer slots.
 * All visual values come from design tokens; consumers style via `className`.
 */

import { forwardRef, type HTMLAttributes, type CSSProperties, type ReactNode } from 'react';

export type CardVariant = 'flat' | 'elevated' | 'outlined';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Visual variant. Default: "elevated". */
  variant?: CardVariant;
  /** Primary heading for the card. Renders in a typography-heading slot. */
  title?: ReactNode;
  /** Secondary descriptor shown below the title. */
  subtitle?: ReactNode;
  /** Main body content. */
  children?: ReactNode;
  /** Media slot — image, video, illustration. Rendered at the top of the card. */
  media?: ReactNode;
  /** Footer slot — action buttons, status indicators, timestamps. */
  footer?: ReactNode;
  /**
   * Activate the whole card via click/Enter. When supplied the card renders
   * as a pointer-cursor interactive container with the correct a11y surface
   * (role, tabindex, keyboard handlers). Equivalent to row-activation in
   * DataTable's card-grid mode.
   */
  onActivate?: () => void;
  /** Shown instead of content while data is being fetched. */
  loading?: boolean;
}

const VARIANT_STYLES: Record<CardVariant, CSSProperties> = {
  flat: {
    backgroundColor: 'var(--prism-card-bg, var(--prism-color-surface-page, #FFFFFF))',
    border: 'none',
    boxShadow: 'none',
  },
  elevated: {
    backgroundColor: 'var(--prism-card-bg, var(--prism-color-surface-elevated, #FFFFFF))',
    border: 'none',
    boxShadow: 'var(--prism-card-shadow, 0 1px 3px rgba(0, 0, 0, 0.1))',
  },
  outlined: {
    backgroundColor: 'var(--prism-card-bg, var(--prism-color-surface-page, #FFFFFF))',
    border: '1px solid var(--prism-color-border-default, #E2E8F0)',
    boxShadow: 'none',
  },
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    variant = 'elevated',
    title,
    subtitle,
    children,
    media,
    footer,
    onActivate,
    loading = false,
    className,
    style: styleProp,
    ...rest
  },
  ref,
) {
  const interactive = onActivate !== undefined;
  const style: CSSProperties = {
    ...VARIANT_STYLES[variant],
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--prism-card-radius, var(--prism-radius-md, 8px))',
    overflow: 'hidden',
    cursor: interactive ? 'pointer' : 'default',
    transition: interactive ? 'box-shadow 150ms, transform 150ms' : undefined,
    ...styleProp,
  };

  const bodyStyle: CSSProperties = {
    padding: 'var(--prism-card-padding, 16px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--prism-spacing-xs, 6px)',
    flex: 1,
    // Ensures long titles / descriptions wrap rather than overflow the card.
    minWidth: 0,
  };

  const titleStyle: CSSProperties = {
    fontSize: 'var(--prism-font-size-h3, 16px)',
    fontWeight: 600,
    color: 'var(--prism-color-text-primary, #0F172A)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: 'var(--prism-font-size-caption, 12px)',
    color: 'var(--prism-color-text-secondary, #64748B)',
    margin: 0,
  };

  const footerStyle: CSSProperties = {
    padding: 'var(--prism-card-padding, 16px)',
    paddingTop: 'var(--prism-spacing-sm, 8px)',
    borderTop: '1px solid var(--prism-color-border-default, #E2E8F0)',
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 'var(--prism-spacing-sm, 8px)',
  };

  const handleKeyDown = interactive
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onActivate?.();
        }
      }
    : undefined;

  return (
    <div
      ref={ref}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onActivate : undefined}
      onKeyDown={handleKeyDown}
      aria-busy={loading || undefined}
      className={className}
      style={style}
      {...rest}
    >
      {media && (
        <div
          style={{
            width: '100%',
            // Media slot opts out of the default padding; consumers place
            // full-bleed images here.
          }}
        >
          {media}
        </div>
      )}
      <div style={bodyStyle}>
        {title && <h3 style={titleStyle}>{title}</h3>}
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        {children && (
          <div
            style={{
              fontSize: 'var(--prism-font-size-body, 14px)',
              color: 'var(--prism-color-text-primary, #0F172A)',
              marginTop: title || subtitle ? 'var(--prism-spacing-xs, 6px)' : 0,
            }}
          >
            {children}
          </div>
        )}
      </div>
      {footer && <div style={footerStyle}>{footer}</div>}
    </div>
  );
});
