/**
 * AI Chat Engine — Public API
 * Spec: docs/specs/05-engine-specifications.md § 5.6
 */

export { ChatEngine } from './chat-engine.js';
export { ChatMessageBubble } from './chat-message.js';
export { ChatInput } from './chat-input.js';
export { StreamOfThought } from './stream-of-thought.js';
export { ActionPlan } from './action-plan.js';
export { SuggestionChips } from './suggestion-chips.js';

export type {
  ChatEngineConfig,
  ChatMessage,
  MessageType,
  MessageSender,
  Citation,
  ToolCallData,
  ToolCallStatus,
  ToolResultData,
  ToolCallStep,
  ActionPlanStep,
  ActionPlanAction,
  SuggestionChip,
  SourceOption,
  ConversationSummary,
} from './types.js';
