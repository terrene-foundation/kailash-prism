/**
 * Auth Template
 * Spec: docs/specs/06-page-templates.md § 6.2.6
 *
 * Centered card layout for login, register, forgot password, etc.
 * No navigation chrome. Optional branding sidebar.
 */

import type { ReactNode, CSSProperties } from 'react';

export interface AuthTemplateProps {
  /** The auth form */
  content: ReactNode;
  /** Brand panel (logo, tagline, illustration) — shown on desktop */
  brandPanel?: ReactNode;
  /** Maximum width of the form card. Default: 420 */
  maxWidth?: number;
  className?: string;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: 'var(--prism-color-surface-page, #F8FAFC)',
};

const brandPanelStyle: CSSProperties = {
  flex: '0 0 40%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--prism-color-interactive-primary, #1E3A5F)',
  color: 'var(--prism-color-text-on-primary, #FFFFFF)',
  padding: 48,
};

const formPanelStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
};

export function AuthTemplate({
  content,
  brandPanel,
  maxWidth = 420,
  className,
}: AuthTemplateProps) {
  return (
    <div style={containerStyle} className={className}>
      {brandPanel && (
        <div style={brandPanelStyle}>
          {brandPanel}
        </div>
      )}
      <div style={formPanelStyle}>
        <div style={{
          width: '100%',
          maxWidth,
          padding: 32,
          borderRadius: 'var(--prism-radius-lg, 12px)',
          backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
          boxShadow: 'var(--prism-shadow-lg, 0px 10px 15px -3px rgba(0,0,0,0.1))',
        }}>
          {content}
        </div>
      </div>
    </div>
  );
}
