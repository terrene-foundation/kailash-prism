/**
 * Calendar Template
 * Spec: docs/specs/06-page-templates.md § 6.2.11
 *
 * Date-based view with day/week/month modes and event detail sidebar.
 */

import type { ReactNode } from 'react';
import { useLayout, VStack, Split } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface CalendarTemplateProps extends BaseTemplateProps {
  /** View mode switcher (day/week/month buttons) */
  viewControls?: ReactNode;
  /** The calendar grid or timeline */
  content: ReactNode;
  /** Event detail sidebar (shown when event selected) */
  eventDetail?: ReactNode;
}

export function CalendarTemplate({
  title,
  subtitle,
  headerActions,
  viewControls,
  content,
  eventDetail,
  className,
}: CalendarTemplateProps) {
  const { isMobile, isTablet } = useLayout();
  const stackDetail = isMobile || isTablet;

  return (
    <VStack gap={16} padding={0} className={className}>
      <TemplateHeader
        title={title}
        subtitle={subtitle}
        headerActions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {viewControls}
            {headerActions}
          </div>
        }
      />

      {eventDetail && !stackDetail ? (
        <Split ratio="3:1" gap={16}>
          {[content, eventDetail]}
        </Split>
      ) : (
        <VStack gap={16}>
          {content}
          {eventDetail}
        </VStack>
      )}
    </VStack>
  );
}
