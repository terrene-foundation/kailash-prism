/**
 * Form Template
 * Spec: docs/specs/06-page-templates.md § 6.2.4
 *
 * Zones: page-header, form-content, sidebar-help
 */

import type { ReactNode } from 'react';
import { useLayout, VStack, Split } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface FormTemplateProps extends BaseTemplateProps {
  /** The form itself (Form engine or FormWizard) */
  content: ReactNode;
  /** Help text, tips, or preview sidebar */
  sidebar?: ReactNode;
  /** Maximum width of the form area in px. Default: 720 */
  maxWidth?: number;
}

export function FormTemplate({
  title,
  subtitle,
  headerActions,
  content,
  sidebar,
  maxWidth = 720,
  className,
}: FormTemplateProps) {
  const { isMobile, isTablet } = useLayout();
  const stackSidebar = isMobile || isTablet;

  return (
    <VStack gap={24} padding={0} className={className}>
      <TemplateHeader title={title} subtitle={subtitle} headerActions={headerActions} />

      {sidebar && !stackSidebar ? (
        <Split ratio="2:1" gap={24}>
          {[
            <div style={{ maxWidth }}>{content}</div>,
            sidebar,
          ]}
        </Split>
      ) : (
        <VStack gap={24}>
          <div style={{ maxWidth: stackSidebar ? undefined : maxWidth }}>{content}</div>
          {sidebar}
        </VStack>
      )}
    </VStack>
  );
}
