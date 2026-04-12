/**
 * Kanban Template
 * Spec: docs/specs/06-page-templates.md § 6.2.10
 *
 * Horizontal scrollable board with columns (e.g., task status lanes).
 */

import type { ReactNode, CSSProperties } from 'react';
import { VStack } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface KanbanColumn {
  id: string;
  title: string;
  count?: number;
  children: ReactNode;
}

export interface KanbanTemplateProps extends BaseTemplateProps {
  /** Board columns */
  columns: KanbanColumn[];
  /** Column width in px. Default: 300 */
  columnWidth?: number;
}

const boardStyle: CSSProperties = {
  display: 'flex',
  gap: 16,
  overflowX: 'auto',
  paddingBottom: 16,
  minHeight: 400,
  scrollbarWidth: 'thin',
};

const columnStyle: CSSProperties = {
  flexShrink: 0,
  backgroundColor: 'var(--prism-color-surface-elevated, #F1F5F9)',
  borderRadius: 'var(--prism-radius-md, 8px)',
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const columnHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '4px 4px 8px',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--prism-color-text-primary, #0F172A)',
};

export function KanbanTemplate({
  title,
  subtitle,
  headerActions,
  columns,
  columnWidth = 300,
  className,
}: KanbanTemplateProps) {
  return (
    <VStack gap={16} padding={0} className={className}>
      <TemplateHeader title={title} subtitle={subtitle} headerActions={headerActions} />
      <div style={boardStyle} role="group" aria-label="Kanban board">
        {columns.map((col) => (
          <div key={col.id} style={{ ...columnStyle, width: columnWidth }} role="list" aria-label={col.title}>
            <div style={columnHeaderStyle}>
              <span>{col.title}</span>
              {col.count != null && (
                <span style={{
                  fontSize: 12,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
                  color: 'var(--prism-color-text-secondary, #64748B)',
                }}>
                  {col.count}
                </span>
              )}
            </div>
            {col.children}
          </div>
        ))}
      </div>
    </VStack>
  );
}
