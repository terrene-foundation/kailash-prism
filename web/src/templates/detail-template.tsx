/**
 * Detail Template
 * Spec: docs/specs/06-page-templates.md § 6.2.3
 *
 * Zones: page-header, hero/summary, tabs/content, sidebar, related
 */

import type { ReactNode } from 'react';
import { useLayout, VStack, Split } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface DetailTemplateProps extends BaseTemplateProps {
  /** Summary card or hero section */
  summary?: ReactNode;
  /** Main content (tabs, sections) */
  content: ReactNode;
  /** Right sidebar (metadata, actions, related) */
  sidebar?: ReactNode;
  /** Related items section at bottom */
  related?: ReactNode;
}

export function DetailTemplate({
  title,
  subtitle,
  headerActions,
  summary,
  content,
  sidebar,
  related,
  className,
}: DetailTemplateProps) {
  const { isMobile, isTablet } = useLayout();
  const stackSidebar = isMobile || isTablet;

  return (
    <VStack gap={24} padding={0} className={className}>
      <TemplateHeader title={title} subtitle={subtitle} headerActions={headerActions} />
      {summary}

      {sidebar && !stackSidebar ? (
        <Split ratio="2:1" gap={24}>
          {[content, sidebar]}
        </Split>
      ) : (
        <VStack gap={24}>
          {content}
          {sidebar}
        </VStack>
      )}

      {related}
    </VStack>
  );
}
