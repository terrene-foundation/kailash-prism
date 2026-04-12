/**
 * ChatMessage — Single message bubble
 * Spec: specs/components/chat-message.yaml
 *
 * Renders user/assistant/system/tool-call/tool-result/error messages
 * with avatar, citations, action buttons, and streaming indicator.
 */

import { useState, useCallback, type CSSProperties, type ReactNode } from 'react';
import type { ChatMessage as ChatMessageData, Citation, ToolCallStep } from './types.js';

// --- Styles ---

const messageBubbleBase: CSSProperties = {
  maxWidth: '80%',
  padding: 'var(--prism-chat-message-padding, 12px 16px)',
  fontSize: 'var(--prism-font-size-body, 14px)',
  lineHeight: 1.5,
  wordBreak: 'break-word',
};

const userBubbleStyle: CSSProperties = {
  ...messageBubbleBase,
  backgroundColor: 'var(--prism-color-interactive-primary, #1E3A5F)',
  color: 'var(--prism-color-text-on-primary, #FFFFFF)',
  borderRadius: 'var(--prism-chat-message-radius, 12px 12px 2px 12px)',
  marginLeft: 'auto',
};

const assistantBubbleStyle: CSSProperties = {
  ...messageBubbleBase,
  backgroundColor: 'var(--prism-color-surface-elevated, #F1F5F9)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  borderRadius: 'var(--prism-chat-message-radius, 12px 12px 12px 2px)',
};

const systemMessageStyle: CSSProperties = {
  textAlign: 'center',
  color: 'var(--prism-color-text-disabled, #94A3B8)',
  fontSize: 12,
  padding: '8px 16px',
};

const errorMessageStyle: CSSProperties = {
  ...messageBubbleBase,
  backgroundColor: 'var(--prism-color-surface-error, #FEF2F2)',
  color: 'var(--prism-color-status-error, #DC2626)',
  borderRadius: 8,
  border: '1px solid var(--prism-color-status-error, #DC2626)',
};

const toolCallStyle: CSSProperties = {
  ...messageBubbleBase,
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
  border: '1px solid var(--prism-color-border-default, #E2E8F0)',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'var(--prism-font-mono, monospace)',
};

const avatarStyle: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  flexShrink: 0,
};

// --- Streaming cursor ---

function StreamingCursor() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 2,
        height: '1em',
        backgroundColor: 'currentColor',
        marginLeft: 2,
        animation: 'prism-cursor-blink 1.06s step-end infinite',
        verticalAlign: 'text-bottom',
      }}
    />
  );
}

// --- Citation list ---

function CitationList({
  citations,
  onCitationClick,
}: {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (citations.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          color: 'var(--prism-color-interactive-primary, #2563EB)',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        {citations.length} source{citations.length !== 1 ? 's' : ''}
      </button>
      {expanded && (
        <div
          role="list"
          style={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {citations.map((cit) => (
            <button
              key={cit.index}
              role="listitem"
              onClick={() => onCitationClick?.(cit)}
              style={{
                display: 'flex',
                gap: 8,
                padding: '6px 8px',
                borderRadius: 6,
                border: '1px solid var(--prism-color-border-default, #E2E8F0)',
                backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 12,
                width: '100%',
              }}
            >
              <span style={{
                fontWeight: 600,
                color: 'var(--prism-color-interactive-primary)',
                minWidth: 20,
              }}>
                [{cit.index}]
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, display: 'block', color: 'var(--prism-color-text-primary)' }}>
                  {cit.source}
                </span>
                <span style={{ color: 'var(--prism-color-text-secondary)', display: 'block', marginTop: 2 }}>
                  {cit.excerpt}
                </span>
              </span>
              {cit.confidence != null && (
                <span style={{
                  fontSize: 11,
                  padding: '2px 6px',
                  borderRadius: 9999,
                  backgroundColor: cit.confidence > 0.8
                    ? 'var(--prism-color-surface-success, #F0FDF4)'
                    : 'var(--prism-color-surface-elevated, #F1F5F9)',
                  color: cit.confidence > 0.8
                    ? 'var(--prism-color-status-success)'
                    : 'var(--prism-color-text-secondary)',
                  whiteSpace: 'nowrap',
                  alignSelf: 'center',
                }}>
                  {Math.round(cit.confidence * 100)}%
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Tool call display ---

function ToolCallDisplay({ message }: { message: ChatMessageData }) {
  const [expanded, setExpanded] = useState(false);
  const tool = message.toolCall;
  if (!tool) return null;

  const statusIcon = tool.status === 'done' ? '✓'
    : tool.status === 'running' ? '⟳'
    : tool.status === 'error' ? '✗'
    : '○';

  const statusColor = tool.status === 'done' ? 'var(--prism-color-status-success)'
    : tool.status === 'error' ? 'var(--prism-color-status-error)'
    : 'var(--prism-color-text-secondary)';

  return (
    <div style={toolCallStyle}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontSize: 13,
          color: 'var(--prism-color-text-primary)',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ color: statusColor }}>{statusIcon}</span>
        <span style={{ fontWeight: 500 }}>{tool.name}</span>
        {tool.duration != null && (
          <span style={{ marginLeft: 'auto', color: 'var(--prism-color-text-secondary)', fontSize: 11 }}>
            {tool.duration < 1000 ? `${tool.duration}ms` : `${(tool.duration / 1000).toFixed(1)}s`}
          </span>
        )}
      </button>
      {expanded && (
        <pre style={{
          marginTop: 8,
          padding: 8,
          borderRadius: 4,
          backgroundColor: 'var(--prism-color-surface-page, #F8FAFC)',
          fontSize: 12,
          overflow: 'auto',
          maxHeight: 200,
        }}>
          {JSON.stringify(tool.parameters, null, 2)}
        </pre>
      )}
    </div>
  );
}

// --- Tool result display ---

function ToolResultDisplay({ message }: { message: ChatMessageData }) {
  const [expanded, setExpanded] = useState(false);
  const result = message.toolResult;
  if (!result) return null;

  return (
    <div style={toolCallStyle}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontSize: 13,
          color: 'var(--prism-color-text-primary)',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ color: result.success ? 'var(--prism-color-status-success)' : 'var(--prism-color-status-error)' }}>
          {result.success ? '✓' : '✗'}
        </span>
        <span>{result.summary}</span>
      </button>
      {expanded && (
        <pre style={{
          marginTop: 8,
          padding: 8,
          borderRadius: 4,
          backgroundColor: 'var(--prism-color-surface-page, #F8FAFC)',
          fontSize: 12,
          overflow: 'auto',
          maxHeight: 200,
        }}>
          {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// --- Main ChatMessageBubble ---

export interface ChatMessageBubbleProps {
  message: ChatMessageData;
  streaming?: boolean;
  avatar?: ReactNode;
  onCitationClick?: (citation: Citation) => void;
  onRetry?: (messageId: string) => void;
}

export function ChatMessageBubble({
  message,
  streaming = false,
  avatar,
  onCitationClick,
  onRetry,
}: ChatMessageBubbleProps) {
  const isUser = message.sender === 'user';
  const isAssistant = message.sender === 'assistant';
  const isSystem = message.type === 'system';
  const isError = message.type === 'error';
  const isToolCall = message.type === 'tool-call';
  const isToolResult = message.type === 'tool-result';

  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // System messages
  if (isSystem) {
    return (
      <div role="status" style={systemMessageStyle}>
        {message.content}
      </div>
    );
  }

  // Tool call
  if (isToolCall) {
    return <ToolCallDisplay message={message} />;
  }

  // Tool result
  if (isToolResult) {
    return <ToolResultDisplay message={message} />;
  }

  // Error
  if (isError) {
    return (
      <div role="alert" style={errorMessageStyle}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Error</div>
        <div>{message.content}</div>
        {onRetry && (
          <button
            onClick={() => onRetry(message.id)}
            style={{
              marginTop: 8,
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid var(--prism-color-status-error)',
              background: 'transparent',
              color: 'var(--prism-color-status-error)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  // User / Assistant messages
  const bubbleStyle = isUser ? userBubbleStyle : assistantBubbleStyle;
  const defaultAvatar = isUser
    ? <div style={{ ...avatarStyle, backgroundColor: 'var(--prism-color-interactive-primary, #1E3A5F)', color: '#fff' }}>U</div>
    : <div style={{ ...avatarStyle, backgroundColor: 'var(--prism-color-surface-elevated, #F1F5F9)', color: 'var(--prism-color-text-primary)' }}>AI</div>;

  return (
    <article
      aria-label={`${message.sender} message at ${timestamp}`}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 8,
        alignItems: 'flex-start',
      }}
    >
      {avatar ?? defaultAvatar}
      <div style={{ maxWidth: '80%', minWidth: 0 }}>
        <div style={bubbleStyle}>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
            {streaming && <StreamingCursor />}
          </div>
        </div>

        {/* Citations */}
        {isAssistant && message.citations && message.citations.length > 0 && (
          <CitationList citations={message.citations} onCitationClick={onCitationClick} />
        )}

        {/* Timestamp */}
        <div style={{
          fontSize: 11,
          color: 'var(--prism-color-text-disabled, #94A3B8)',
          marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
        }}>
          {timestamp}
        </div>
      </div>
    </article>
  );
}
