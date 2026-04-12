/**
 * AI Chat Engine — Root container
 * Spec: docs/specs/05-engine-specifications.md § 5.6
 *
 * Composes ChatMessage, ChatInput, StreamOfThought, ActionPlan,
 * and SuggestionChips into a complete chat interface.
 */

import { useState, useCallback, useRef, useEffect, type CSSProperties } from 'react';
import type { ChatEngineConfig, ChatMessage, SuggestionChip } from './types.js';
import { ChatMessageBubble } from './chat-message.js';
import { ChatInput } from './chat-input.js';
import { StreamOfThought } from './stream-of-thought.js';
import { ActionPlan } from './action-plan.js';
import { SuggestionChips } from './suggestion-chips.js';

// --- Styles ---

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
};

const messageListStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 16px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const emptyStateStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
  padding: 32,
  color: 'var(--prism-color-text-secondary, #64748B)',
};

const bottomAreaStyle: CSSProperties = {
  padding: '0 16px 8px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

// --- ChatEngine component ---

export function ChatEngine({
  messages,
  isStreaming = false,
  streamBuffer,
  toolCallSteps = [],
  actionPlan,
  suggestions = [],
  input = {},
  avatars,
  features = {},
  onSend,
  onActionPlanResponse,
  onCitationClick,
  onSuggestionClick,
  onRetry,
  className,
  'aria-label': ariaLabel,
}: ChatEngineConfig) {
  const [inputValue, setInputValue] = useState('');
  const messageListRef = useRef<HTMLDivElement>(null);

  const showCitations = features.citations !== false;
  const showToolCalls = features.toolCalls !== false;
  const showActionPlans = features.actionPlans !== false;
  const showSuggestions = features.suggestions !== false;

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages.length, streamBuffer]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    onSend?.({ content: inputValue.trim() });
    setInputValue('');
  }, [inputValue, onSend]);

  const handleSuggestionClick = useCallback(
    (suggestion: SuggestionChip) => {
      if (onSuggestionClick) {
        onSuggestionClick(suggestion);
      } else {
        // Default: put suggestion text in input
        setInputValue(suggestion.value);
      }
    },
    [onSuggestionClick],
  );

  const isEmpty = messages.length === 0;

  // Build the streaming message if active
  const streamingMessage: ChatMessage | null =
    isStreaming && streamBuffer
      ? {
          id: '__streaming__',
          type: 'assistant-streaming',
          content: streamBuffer,
          timestamp: Date.now(),
          sender: 'assistant',
        }
      : null;

  return (
    <div
      role="log"
      aria-label={ariaLabel ?? 'Chat conversation'}
      aria-live="polite"
      className={className}
      style={containerStyle}
    >
      {/* Message list */}
      {isEmpty ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: 32 }}>💬</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--prism-color-text-primary)' }}>
            Start a conversation
          </div>
          <div style={{ fontSize: 14, textAlign: 'center', maxWidth: 400 }}>
            Type a message below or choose a suggestion to get started.
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionChips suggestions={suggestions} onSelect={handleSuggestionClick} />
          )}
        </div>
      ) : (
        <div ref={messageListRef} style={messageListStyle}>
          {messages.map((message) => {
            // Skip tool-call/result if feature disabled
            if (!showToolCalls && (message.type === 'tool-call' || message.type === 'tool-result')) {
              return null;
            }

            return (
              <ChatMessageBubble
                key={message.id}
                message={message}
                avatar={
                  message.sender === 'user'
                    ? avatars?.user
                    : message.sender === 'assistant'
                      ? avatars?.assistant
                      : undefined
                }
                onCitationClick={showCitations ? onCitationClick : undefined}
                onRetry={onRetry}
              />
            );
          })}

          {/* Streaming message in progress */}
          {streamingMessage && (
            <ChatMessageBubble
              message={streamingMessage}
              streaming
              avatar={avatars?.assistant}
              onCitationClick={showCitations ? onCitationClick : undefined}
            />
          )}

          {/* Tool call steps (StreamOfThought) */}
          {showToolCalls && toolCallSteps.length > 0 && (
            <StreamOfThought steps={toolCallSteps} />
          )}

          {/* Action plan */}
          {showActionPlans && actionPlan && actionPlan.length > 0 && onActionPlanResponse && (
            <ActionPlan steps={actionPlan} onResponse={onActionPlanResponse} />
          )}
        </div>
      )}

      {/* Bottom area: suggestions + input */}
      <div style={bottomAreaStyle}>
        {/* Suggestion chips (after messages, before input) */}
        {!isEmpty && showSuggestions && suggestions.length > 0 && !isStreaming && (
          <SuggestionChips suggestions={suggestions} onSelect={handleSuggestionClick} />
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        placeholder={input.placeholder}
        disabled={input.disabled ?? isStreaming}
        allowAttachments={input.allowAttachments}
        onAttach={onSend ? (files) => onSend({ content: '', attachments: files }) : undefined}
      />

      {/* Cursor blink animation */}
      <style>{`
        @keyframes prism-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
