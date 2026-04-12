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

// --- Engine config ---

export interface ChatEngineConfig {
  /** Messages to display */
  messages: ChatMessage[];
  /** Whether a response is currently streaming */
  isStreaming?: boolean;
  /** Accumulated stream buffer (shown as in-progress message) */
  streamBuffer?: string;
  /** Active tool call steps for StreamOfThought display */
  toolCallSteps?: ToolCallStep[];
  /** Action plan awaiting user response */
  actionPlan?: ActionPlanStep[];
  /** Suggestion chips shown when conversation is empty or after a response */
  suggestions?: SuggestionChip[];

  /** Input configuration */
  input?: {
    placeholder?: string;
    maxLength?: number;
    disabled?: boolean;
    sources?: SourceOption[];
    allowAttachments?: boolean;
  };

  /** Avatars */
  avatars?: {
    user?: ReactNode;
    assistant?: ReactNode;
  };

  /** Features toggles */
  features?: {
    citations?: boolean;
    toolCalls?: boolean;
    actionPlans?: boolean;
    suggestions?: boolean;
  };

  /** Callbacks */
  onSend?: (message: { content: string; attachments?: File[]; source?: string }) => void;
  onActionPlanResponse?: (response: { stepIndex: number; action: ActionPlanAction; modification?: string }) => void;
  onCitationClick?: (citation: Citation) => void;
  onSuggestionClick?: (suggestion: SuggestionChip) => void;
  onRetry?: (messageId: string) => void;

  /** Composition */
  className?: string;
  'aria-label'?: string;
}
