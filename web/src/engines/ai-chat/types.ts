/**
 * AI Chat Engine — Types
 * Spec: docs/specs/05-engine-specifications.md § 5.6
 */

import type { ReactNode } from 'react';

// --- Message types ---

export type MessageType =
  | 'user'
  | 'assistant'
  | 'assistant-streaming'
  | 'system'
  | 'tool-call'
  | 'tool-result'
  | 'error';

export type MessageSender = 'user' | 'assistant' | 'system';

export type ToolCallStatus = 'queued' | 'running' | 'done' | 'error';

export interface Citation {
  index: number;
  source: string;
  excerpt: string;
  confidence?: number;
  page?: number;
}

export interface ToolCallData {
  name: string;
  parameters: Record<string, unknown>;
  status: ToolCallStatus;
  duration?: number;
}

export interface ToolResultData {
  summary: string;
  data: unknown;
  success: boolean;
}

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  sender: MessageSender;
  citations?: Citation[];
  toolCall?: ToolCallData;
  toolResult?: ToolResultData;
  parentId?: string;
  branchIndex?: number;
}

// --- Action plan ---

export type ActionPlanAction = 'approve' | 'modify' | 'reject';

export interface ActionPlanStep {
  index: number;
  description: string;
  status: 'pending' | 'approved' | 'modified' | 'rejected';
  modification?: string;
}

// --- Tool call steps (StreamOfThought) ---

export interface ToolCallStep {
  id: string;
  name: string;
  status: ToolCallStatus;
  duration?: number;
  summary?: string;
}

// --- Suggestion chips ---

export interface SuggestionChip {
  label: string;
  value: string;
  icon?: string;
}

// --- Source option ---

export interface SourceOption {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}

// --- Conversation sidebar ---

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;
  messageCount: number;
}

// --- Chat adapter (transport-agnostic) ---

/** Handle returned by ChatAdapter.sendMessage for managing an active stream */
export interface ChatStreamHandle {
  /** Register a callback for each text token as it arrives */
  onToken(callback: (token: string) => void): void;
  /** Register a callback for when the stream completes */
  onComplete(callback: (message: ChatMessage) => void): void;
  /** Register a callback for stream errors */
  onError(callback: (error: Error) => void): void;
  /** Abort the active stream */
  abort(): void;
}

/**
 * Transport-agnostic adapter for chat backends.
 * Consumers implement this interface to connect Prism's chat state
 * management to their specific API (SSE, WebSocket, REST, etc.).
 */
export interface ChatAdapter {
  /** List all conversations for the current user */
  listConversations(): Promise<ConversationSummary[]>;
  /** Load message history for a conversation */
  loadMessages(conversationId: string): Promise<ChatMessage[]>;
  /** Send a message. Returns a stream handle for token-by-token updates. */
  sendMessage(
    conversationId: string | null,
    content: string,
    attachments?: File[],
  ): ChatStreamHandle;
  /** Delete a conversation */
  deleteConversation(id: string): Promise<void>;
  /** Rename a conversation */
  renameConversation(id: string, title: string): Promise<void>;
}

// --- Conversation sidebar ---

export interface ConversationSidebarProps {
  /** Conversations to display */
  conversations: ConversationSummary[];
  /** Currently active conversation ID */
  activeId: string | null;
  /** Called when a conversation is selected */
  onSelect: (id: string) => void;
  /** Called when "New Conversation" is clicked */
  onNew: () => void;
  /** Called when a conversation is deleted */
  onDelete?: ((id: string) => void) | undefined;
  /** Called when a conversation is renamed */
  onRename?: ((id: string, title: string) => void) | undefined;
  /** Whether delete operations are in progress */
  deleteLoading?: boolean;
  /** Whether rename operations are in progress */
  renameLoading?: boolean;
  /** Collapsed mode — shows icon strip only */
  collapsed?: boolean;
  /** Toggle collapsed state */
  onToggleCollapse?: (() => void) | undefined;
  /** Render custom metadata per conversation (e.g. risk tier badge) */
  renderMeta?: ((conversation: ConversationSummary) => ReactNode) | undefined;
  /** Composition */
  className?: string | undefined;
}

// --- Engine config ---

export interface ChatEngineConfig {
  /** Messages to display */
  messages: ChatMessage[];
  /** Whether a response is currently streaming */
  isStreaming?: boolean;
  /** Accumulated stream buffer (shown as in-progress message) */
  streamBuffer?: string | undefined;
  /** Active tool call steps for StreamOfThought display */
  toolCallSteps?: ToolCallStep[] | undefined;
  /** Action plan awaiting user response */
  actionPlan?: ActionPlanStep[] | undefined;
  /** Suggestion chips shown when conversation is empty or after a response */
  suggestions?: SuggestionChip[] | undefined;

  /** Input configuration */
  input?: {
    placeholder?: string;
    maxLength?: number;
    disabled?: boolean;
    sources?: SourceOption[];
    allowAttachments?: boolean;
  } | undefined;

  /** Avatars */
  avatars?: {
    user?: ReactNode;
    assistant?: ReactNode;
  } | undefined;

  /** Features toggles */
  features?: {
    citations?: boolean;
    toolCalls?: boolean;
    actionPlans?: boolean;
    suggestions?: boolean;
  } | undefined;

  /** Callbacks */
  onSend?: ((message: { content: string; attachments?: File[]; source?: string }) => void) | undefined;
  onActionPlanResponse?: ((response: { stepIndex: number; action: ActionPlanAction; modification?: string }) => void) | undefined;
  onCitationClick?: ((citation: Citation) => void) | undefined;
  onSuggestionClick?: ((suggestion: SuggestionChip) => void) | undefined;
  onRetry?: ((messageId: string) => void) | undefined;

  /** Composition */
  className?: string | undefined;
  'aria-label'?: string | undefined;
}
