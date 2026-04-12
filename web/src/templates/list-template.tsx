/**
 * List Template
 * Spec: docs/specs/06-page-templates.md § 6.2.2
 *
 * Zones: page-header, filter-bar, content (DataTable), footer
 */

import type { ReactNode } from 'react';
import { VStack } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface ListTemplateProps extends BaseTemplateProps {
  /** Search + filters row */
  filterBar?: ReactNode;
  /** DataTable or CardGrid */
  content: ReactNode;
  /** Bulk action bar + pagination */
  footer?: ReactNode;
}

export function ListTemplate({
  title,
  subtitle,
  headerActions,
  filterBar,
  content,
  footer,
  className,
}: ListTemplateProps) {
  return (
    <VStack gap={16} padding={0} className={className}>
      <TemplateHeader title={title} subtitle={subtitle} headerActions={headerActions} />
      {filterBar}
      {content}
      {footer}
    </VStack>
  );
}
