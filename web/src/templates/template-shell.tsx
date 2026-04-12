/**
 * Template Shell — Shared page header and zone wrapper
 *
 * Every template uses this shell for consistent header rendering
 * and zone layout. Templates compose zones below the header.
 */

import type { ReactNode, CSSProperties } from 'react';
import type { BaseTemplateProps } from './types.js';

// --- Page header (shared across all templates) ---

export function TemplateHeader({
  title,
  subtitle,
  headerActions,
}: Pick<BaseTemplateProps, 'title' | 'subtitle' | 'headerActions'>) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        minHeight: 48,
      }}
    >
      <div>
        <h1 style={{
          fontSize: 'var(--prism-font-size-heading, 24px)',
          fontWeight: 700,
          color: 'var(--prism-color-text-primary, #0F172A)',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: 'var(--prism-font-size-body, 14px)',
            color: 'var(--prism-color-text-secondary, #64748B)',
            margin: '4px 0 0',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {headerActions && (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {headerActions}
        </div>
      )}
    </div>
  );
}

// --- Zone wrapper (renders named zone with responsive visibility) ---

export interface ZoneWrapperProps {
  name: string;
  children: ReactNode;
  sticky?: boolean;
  style?: CSSProperties;
}

export function ZoneWrapper({ name, children, sticky, style }: ZoneWrapperProps) {
  return (
    <section
      data-zone={name}
      aria-label={name.replace(/-/g, ' ')}
      style={{
        ...(sticky ? { position: 'sticky' as const, top: 0, zIndex: 10 } : {}),
        ...style,
      }}
    >
      {children}
    </section>
  );
}
