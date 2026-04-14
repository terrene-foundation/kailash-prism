/**
 * Conversation Template
 * Spec: docs/specs/06-page-templates.md § 6.2.7
 *
 * Two usage modes:
 *
 * 1. **Wired mode** (recommended): Pass `adapter` + optional overrides.
 *    The template internally wires ConversationSidebar, ChatEngine,
 *    and useChatState into a turnkey chat layout.
 *
 * 2. **Manual mode**: Pass `conversationList` + `content` as ReactNode.
 *    Full control, no internal state management.
 */

import { useState, useCallback, type ReactNode, type CSSProperties } from 'react';
import { useLayout, useLayoutMaybe, LayoutProvider } from '../engines/layout.js';
import { ChatEngine } from '../engines/ai-chat/chat-engine.js';
import { ConversationSidebar } from '../engines/ai-chat/conversation-sidebar.js';
import { useChatState } from '../engines/ai-chat/use-chat-state.js';
import type {
  ChatAdapter,
  ChatMessage,
  ConversationSummary,
  ActionPlanAction,
  SuggestionChip,
  ToolCallStep,
  ActionPlanStep,
  Citation,
  SourceOption,
} from '../engines/ai-chat/types.js';
import type { ChatStateOptions } from '../engines/ai-chat/use-chat-state.js';

// --- Shared layout props ---

interface LayoutProps {
  /** Width of the conversation list. Default: 280 */
  listWidth?: number;
  /** Width of the detail panel. Default: 320 */
  detailWidth?: number;
  className?: string;
}

// --- Manual mode (backwards-compatible) ---

export interface ConversationTemplateManualProps extends LayoutProps {
  /** Conversation list sidebar (manual mode) */
  conversationList?: ReactNode;
  /** Chat engine content (manual mode) */
  content: ReactNode;
  /** Citation or detail panel on the right */
  detailPanel?: ReactNode;
  /** Discriminator: manual mode has no adapter */
  adapter?: undefined;
}

// --- Wired mode ---

export interface ConversationTemplateWiredProps extends LayoutProps {
  /** Transport adapter — enables wired mode */
  adapter: ChatAdapter;

  /** useChatState options override */
  chatStateOptions?: Omit<ChatStateOptions, 'adapter'>;

  /** Detail panel (e.g. citation panel) */
  detailPanel?: ReactNode;

  /** Render custom metadata per conversation (e.g. risk tier badge) */
  renderMeta?: (conversation: ConversationSummary) => ReactNode;

  /** Sidebar header label. Default: "Conversations" */
  sidebarLabel?: string;

  /** Chat engine avatars */
  avatars?: {
    user?: ReactNode;
    assistant?: ReactNode;
  };

  /** Chat engine feature toggles */
  features?: {
    citations?: boolean;
    toolCalls?: boolean;
    actionPlans?: boolean;
    suggestions?: boolean;
  };

  /** Chat input configuration */
  input?: {
    placeholder?: string;
    maxLength?: number;
    disabled?: boolean;
    sources?: SourceOption[];
    allowAttachments?: boolean;
  };

  /** Active tool call steps for StreamOfThought display */
  toolCallSteps?: ToolCallStep[];
  /** Action plan awaiting user response */
  actionPlan?: ActionPlanStep[];
  /** Suggestion chips */
  suggestions?: SuggestionChip[];

  /** Render custom action buttons per message (e.g. feedback, escalation) */
  renderMessageActions?: (message: ChatMessage) => ReactNode;

  /** Callbacks for advanced consumers */
  onActionPlanResponse?: (response: { stepIndex: number; action: ActionPlanAction; modification?: string }) => void;
  onCitationClick?: (citation: Citation) => void;
  onSuggestionClick?: (suggestion: SuggestionChip) => void;
  onRetry?: (messageId: string) => void;
  /** Context passed to every adapter.sendMessage call (e.g. company_id, tenant) */
  sendContext?: Record<string, unknown> | undefined;
  /** Called after a message is sent (for domain-specific side effects) */
  onMessageSent?: (content: string, attachments?: File[]) => void;
  /** Called when the active conversation changes */
  onConversationChange?: (id: string | null) => void;

  /** Override the rendered chat content entirely (for full customization with access to state) */
  renderContent?: (state: WiredChatState) => ReactNode;
  /** Override the rendered sidebar entirely */
  renderSidebar?: (state: WiredChatState) => ReactNode;

  /** Manual mode props are not available in wired mode */
  conversationList?: undefined;
  content?: undefined;
}

/** State exposed to render* overrides in wired mode */
export interface WiredChatState {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamBuffer: string;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  error: Error | null;
  switchConversation: (id: string) => void;
  startNewConversation: () => void;
  sendMessage: (content: string, attachments?: File[]) => void;
  stopStreaming: () => void;
  deleteConversation: (id: string) => Promise<void>;
  renameConversation: (id: string, title: string) => Promise<void>;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export type ConversationTemplateProps =
  | ConversationTemplateManualProps
  | ConversationTemplateWiredProps;

// --- Styles ---

const containerStyle: CSSProperties = {
  display: 'flex',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
};

const sidebarPanelStyle: CSSProperties = {
  borderRight: '1px solid var(--prism-color-border-default, #E2E8F0)',
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
  overflowY: 'auto',
  flexShrink: 0,
};

const detailPanelStyle: CSSProperties = {
  borderLeft: '1px solid var(--prism-color-border-default, #E2E8F0)',
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
  overflowY: 'auto',
  flexShrink: 0,
};

// --- Wired inner component ---

function WiredConversation({
  adapter,
  chatStateOptions,
  detailPanel,
  renderMeta,
  avatars,
  features,
  input,
  toolCallSteps,
  actionPlan,
  suggestions,
  renderMessageActions,
  sendContext,
  onActionPlanResponse,
  onCitationClick,
  onSuggestionClick,
  onRetry,
  onMessageSent,
  onConversationChange,
  renderContent,
  renderSidebar,
  listWidth = 280,
  detailWidth = 320,
  className,
}: ConversationTemplateWiredProps) {
  const { isMobile, isTablet } = useLayout();
  const hideList = isMobile;
  const hideDetail = isMobile || isTablet;

  const chatState = useChatState({
    adapter,
    ...chatStateOptions,
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);

  const handleSend = useCallback(
    (msg: { content: string; attachments?: File[] }) => {
      chatState.sendMessage(msg.content, msg.attachments, sendContext);
      onMessageSent?.(msg.content, msg.attachments);
    },
    [chatState, onMessageSent, sendContext],
  );

  const handleSelect = useCallback(
    (id: string) => {
      chatState.switchConversation(id);
      onConversationChange?.(id);
    },
    [chatState, onConversationChange],
  );

  const handleNew = useCallback(() => {
    chatState.startNewConversation();
    onConversationChange?.(null);
  }, [chatState, onConversationChange]);

  // Expose state for render overrides
  const exposedState: WiredChatState = {
    ...chatState,
    sidebarCollapsed,
    toggleSidebar,
  };

  // Sidebar
  const sidebarNode = renderSidebar ? renderSidebar(exposedState) : (
    <ConversationSidebar
      conversations={chatState.conversations}
      activeId={chatState.activeConversationId}
      onSelect={handleSelect}
      onNew={handleNew}
      onDelete={chatState.deleteConversation}
      onRename={chatState.renameConversation}
      isLoading={chatState.isLoadingConversations}
      collapsed={sidebarCollapsed}
      onToggleCollapse={toggleSidebar}
      renderMeta={renderMeta}
    />
  );

  // Content
  const contentNode = renderContent ? renderContent(exposedState) : (
    <ChatEngine
      messages={chatState.messages}
      isStreaming={chatState.isStreaming}
      streamBuffer={chatState.streamBuffer}
      toolCallSteps={toolCallSteps}
      actionPlan={actionPlan}
      suggestions={suggestions}
      input={input}
      avatars={avatars}
      features={features}
      onSend={handleSend}
      renderMessageActions={renderMessageActions}
      onActionPlanResponse={onActionPlanResponse}
      onCitationClick={onCitationClick}
      onSuggestionClick={onSuggestionClick}
      onRetry={onRetry}
    />
  );

  return (
    <div style={containerStyle} className={className}>
      {!hideList && (
        <div style={{ ...sidebarPanelStyle, width: sidebarCollapsed ? undefined : listWidth }}>
          {sidebarNode}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {contentNode}
      </div>
      {detailPanel && !hideDetail && (
        <div style={{ ...detailPanelStyle, width: detailWidth }}>
          {detailPanel}
        </div>
      )}
    </div>
  );
}

// --- Auto-wrap helper ---

function WithLayout({ children }: { children: ReactNode }) {
  const existing = useLayoutMaybe();
  if (existing) return <>{children}</>;
  return <LayoutProvider>{children}</LayoutProvider>;
}

// --- Main export ---

export function ConversationTemplate(props: ConversationTemplateProps) {
  return (
    <WithLayout>
      <ConversationTemplateInner {...props} />
    </WithLayout>
  );
}

function ConversationTemplateInner(props: ConversationTemplateProps) {
  if (props.adapter) {
    return <WiredConversation {...props} />;
  }

  // Manual mode — backwards-compatible bare layout
  const {
    conversationList,
    content,
    detailPanel,
    listWidth = 280,
    detailWidth = 320,
    className,
  } = props;

  const { isMobile, isTablet } = useLayout();
  const hideList = isMobile;
  const hideDetail = isMobile || isTablet;

  return (
    <div style={containerStyle} className={className}>
      {conversationList && !hideList && (
        <div style={{ ...sidebarPanelStyle, width: listWidth }}>
          {conversationList}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {content}
      </div>
      {detailPanel && !hideDetail && (
        <div style={{ ...detailPanelStyle, width: detailWidth }}>
          {detailPanel}
        </div>
      )}
    </div>
  );
}
