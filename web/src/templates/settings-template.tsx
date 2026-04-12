/**
 * Settings Template
 * Spec: docs/specs/06-page-templates.md § 6.2.5
 *
 * Zones: page-header, nav-tabs, settings-content
 * Two-column layout: settings nav on left, form sections on right.
 */

import type { ReactNode } from 'react';
import { useLayout, VStack, Split } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface SettingsTemplateProps extends BaseTemplateProps {
  /** Settings navigation (vertical tabs or list) */
  settingsNav?: ReactNode;
  /** Settings form sections */
  content: ReactNode;
}

export function SettingsTemplate({
  title,
  subtitle,
  headerActions,
  settingsNav,
  content,
  className,
}: SettingsTemplateProps) {
  const { isMobile } = useLayout();

  return (
    <VStack gap={24} padding={0} className={className}>
      <TemplateHeader title={title} subtitle={subtitle} headerActions={headerActions} />

      {settingsNav && !isMobile ? (
        <Split ratio="1:3" gap={24}>
          {[settingsNav, content]}
        </Split>
      ) : (
        <VStack gap={16}>
          {settingsNav}
          {content}
        </VStack>
      )}
    </VStack>
  );
}
