/**
 * ChatInput — Message input with auto-growing textarea, attachments, send
 * Spec: specs/components/chat-input.yaml
 */

import {
  useCallback,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach?: ((files: File[]) => void) | undefined;
  placeholder?: string | undefined;
  disabled?: boolean;
  allowAttachments?: boolean | undefined;
  className?: string | undefined;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 8,
  padding: 12,
  borderTop: '1px solid var(--prism-color-border-default, #E2E8F0)',
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
};

const textareaStyle: CSSProperties = {
  flex: 1,
  resize: 'none',
  border: '1px solid var(--prism-color-border-default, #CBD5E1)',
  borderRadius: 'var(--prism-chat-input-radius, 8px)',
  padding: '8px 12px',
  fontSize: 'var(--prism-font-size-body, 14px)',
  lineHeight: 1.5,
  backgroundColor: 'var(--prism-color-surface-page, #FFFFFF)',
  color: 'var(--prism-color-text-primary, #0F172A)',
  outline: 'none',
  fontFamily: 'inherit',
  minHeight: 40,
  maxHeight: 200,
  overflow: 'auto',
};

const buttonBaseStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontSize: 16,
  flexShrink: 0,
};

export function ChatInput({
  value,
  onChange,
  onSend,
  onAttach,
  placeholder = 'Type a message...',
  disabled = false,
  allowAttachments = false,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSend = value.trim().length > 0 && !disabled;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSend) {
        e.preventDefault();
        onSend();
      }
    },
    [canSend, onSend],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      // Auto-grow textarea
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    },
    [onChange],
  );

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0 && onAttach) {
        onAttach(Array.from(files));
      }
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [onAttach],
  );

  return (
    <div className={className} style={containerStyle}>
      {allowAttachments && (
        <>
          <button
            type="button"
            onClick={handleAttachClick}
            disabled={disabled}
            aria-label="Attach files"
            style={{
              ...buttonBaseStyle,
              backgroundColor: 'transparent',
              color: 'var(--prism-color-text-secondary, #64748B)',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
            tabIndex={-1}
          />
        </>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Message input"
        aria-multiline="true"
        aria-disabled={disabled}
        rows={1}
        style={{
          ...textareaStyle,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'text',
        }}
      />

      <button
        type="button"
        onClick={canSend ? onSend : undefined}
        disabled={!canSend}
        aria-label="Send message"
        style={{
          ...buttonBaseStyle,
          backgroundColor: canSend
            ? 'var(--prism-color-interactive-primary, #1E3A5F)'
            : 'var(--prism-color-surface-elevated, #E2E8F0)',
          color: canSend
            ? 'var(--prism-color-text-on-primary, #FFFFFF)'
            : 'var(--prism-color-text-disabled, #94A3B8)',
          cursor: canSend ? 'pointer' : 'default',
        }}
      >
        ↑
      </button>
    </div>
  );
}
