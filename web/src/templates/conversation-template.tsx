/**
 * Conversation Template
 * Spec: docs/specs/06-page-templates.md § 6.2.7
 *
 * Full-height chat layout with optional conversation sidebar.
 * Purpose-built for the AI Chat engine.
 */

import type { ReactNode, CSSProperties } from 'react';
import { useLayout } from '../engines/layout.js';

export interface ConversationTemplateProps {
  /** Conversation list sidebar */
  conversationList?: ReactNode;
  /** Chat engine content (fills remaining space) */
  content: ReactNode;
  /** Citation or detail panel on the right */
  detailPanel?: ReactNode;
  /** Width of the conversation list. Default: 280 */
  listWidth?: number;
  /** Width of the detail panel. Default: 320 */
  detailWidth?: number;
  className?: string;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
};

const sidebarStyle: CSSProperties = {
  borderRight: '1px solid var(--prism-color-border-default, #E2E8F0)',
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
  overflowY: 'auto',
  flexShrink: 0,
};

const detailStyle: CSSProperties = {
  borderLeft: '1px solid var(--prism-color-border-default, #E2E8F0)',
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
  overflowY: 'auto',
  flexShrink: 0,
};

export function ConversationTemplate({
  conversationList,
  content,
  detailPanel,
  listWidth = 280,
  detailWidth = 320,
  className,
}: ConversationTemplateProps) {
  const { isMobile, isTablet } = useLayout();
  const hideList = isMobile;
  const hideDetail = isMobile || isTablet;

  return (
    <div style={containerStyle} className={className}>
      {conversationList && !hideList && (
        <div style={{ ...sidebarStyle, width: listWidth }}>
          {conversationList}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {content}
      </div>
      {detailPanel && !hideDetail && (
        <div style={{ ...detailStyle, width: detailWidth }}>
          {detailPanel}
        </div>
      )}
    </div>
  );
}
