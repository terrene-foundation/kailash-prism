/**
 * AI Chat Engine — Tests
 * Covers: message rendering, input, streaming, tool calls, action plan,
 * suggestions, citations, accessibility, empty state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatEngine } from './ai-chat/index.js';
import { ChatMessageBubble } from './ai-chat/chat-message.js';
import { ChatInput } from './ai-chat/chat-input.js';
import { StreamOfThought } from './ai-chat/stream-of-thought.js';
import { ActionPlan } from './ai-chat/action-plan.js';
import { SuggestionChips } from './ai-chat/suggestion-chips.js';
import type {
  ChatMessage,
  ChatEngineConfig,
  ToolCallStep,
  ActionPlanStep,
  SuggestionChip,
} from './ai-chat/types.js';

// --- Fixtures ---

function makeMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'msg-1',
    type: 'user',
    content: 'Hello, world!',
    timestamp: Date.now(),
    sender: 'user',
    ...overrides,
  };
}

function makeMessages(): ChatMessage[] {
  return [
    makeMessage({ id: 'msg-1', type: 'user', sender: 'user', content: 'What is Kailash?' }),
    makeMessage({
      id: 'msg-2',
      type: 'assistant',
      sender: 'assistant',
      content: 'Kailash is an open-source workflow orchestration platform.',
      citations: [
        { index: 1, source: 'docs/overview.md', excerpt: 'Kailash provides workflow...', confidence: 0.92 },
      ],
    }),
  ];
}

const defaultConfig: ChatEngineConfig = {
  messages: makeMessages(),
  onSend: vi.fn(),
};

// --- ChatEngine (full container) ---

describe('ChatEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders messages', () => {
      render(<ChatEngine {...defaultConfig} />);
      expect(screen.getByText('What is Kailash?')).toBeDefined();
      expect(screen.getByText(/Kailash is an open-source/)).toBeDefined();
    });

    it('has role="log" and aria-label', () => {
      const { container } = render(<ChatEngine {...defaultConfig} />);
      const log = container.querySelector('[role="log"]');
      expect(log).toBeDefined();
      expect(log?.getAttribute('aria-label')).toBe('Chat conversation');
    });

    it('renders empty state when no messages', () => {
      render(<ChatEngine messages={[]} onSend={vi.fn()} />);
      expect(screen.getByText('Start a conversation')).toBeDefined();
    });

    it('renders suggestion chips in empty state', () => {
      const suggestions: SuggestionChip[] = [
        { label: 'Help me write', value: 'help', icon: '✍️' },
        { label: 'Analyze data', value: 'analyze' },
      ];
      render(<ChatEngine messages={[]} suggestions={suggestions} onSend={vi.fn()} />);
      expect(screen.getByText('Help me write')).toBeDefined();
      expect(screen.getByText('Analyze data')).toBeDefined();
    });
  });

  describe('Streaming', () => {
    it('renders streaming message with cursor', () => {
      render(
        <ChatEngine
          messages={[makeMessage()]}
          isStreaming
          streamBuffer="I am currently thinking about"
          onSend={vi.fn()}
        />,
      );
      expect(screen.getByText(/I am currently thinking about/)).toBeDefined();
    });

    it('disables input during streaming', () => {
      const { container } = render(
        <ChatEngine messages={[makeMessage()]} isStreaming streamBuffer="..." onSend={vi.fn()} />,
      );
      const textarea = container.querySelector('textarea');
      expect(textarea?.disabled).toBe(true);
    });
  });

  describe('Input', () => {
    it('calls onSend when send button clicked with content', () => {
      const onSend = vi.fn();
      const { container } = render(<ChatEngine messages={[]} onSend={onSend} />);
      const textarea = container.querySelector('textarea')!;
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      const sendButton = screen.getByLabelText('Send message');
      fireEvent.click(sendButton);
      expect(onSend).toHaveBeenCalledWith({ content: 'Test message' });
    });

    it('clears input after sending', () => {
      const { container } = render(<ChatEngine messages={[]} onSend={vi.fn()} />);
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: 'Test' } });
      fireEvent.click(screen.getByLabelText('Send message'));
      expect(textarea.value).toBe('');
    });
  });

  describe('Tool calls', () => {
    it('renders StreamOfThought when tool call steps present', () => {
      const steps: ToolCallStep[] = [
        { id: 's1', name: 'search', status: 'done', duration: 1200, summary: 'Searching knowledge base...' },
        { id: 's2', name: 'analyze', status: 'running', summary: 'Analyzing documents...' },
      ];
      render(<ChatEngine messages={[makeMessage()]} toolCallSteps={steps} onSend={vi.fn()} />);
      expect(screen.getByText('Searching knowledge base...')).toBeDefined();
      expect(screen.getByText('Analyzing documents...')).toBeDefined();
    });

    it('hides tool calls when feature disabled', () => {
      const steps: ToolCallStep[] = [
        { id: 's1', name: 'search', status: 'done', summary: 'Searching...' },
      ];
      render(
        <ChatEngine
          messages={[makeMessage()]}
          toolCallSteps={steps}
          features={{ toolCalls: false }}
          onSend={vi.fn()}
        />,
      );
      expect(screen.queryByText('Searching...')).toBeNull();
    });
  });

  describe('Action plan', () => {
    it('renders action plan with approve/modify/reject buttons', () => {
      const plan: ActionPlanStep[] = [
        { index: 0, description: 'Create database schema', status: 'pending' },
        { index: 1, description: 'Build API endpoints', status: 'pending' },
      ];
      const onResponse = vi.fn();
      render(
        <ChatEngine messages={[makeMessage()]} actionPlan={plan} onActionPlanResponse={onResponse} onSend={vi.fn()} />,
      );
      expect(screen.getByText('Create database schema')).toBeDefined();
      expect(screen.getByText('Build API endpoints')).toBeDefined();
      const approveButtons = screen.getAllByText('Approve');
      expect(approveButtons.length).toBe(2);
    });
  });
});

// --- ChatMessageBubble ---

describe('ChatMessageBubble', () => {
  it('renders user message right-aligned', () => {
    const { container } = render(<ChatMessageBubble message={makeMessage()} />);
    const article = container.querySelector('article');
    expect(article?.style.flexDirection).toBe('row-reverse');
  });

  it('renders assistant message left-aligned', () => {
    const msg = makeMessage({ sender: 'assistant', type: 'assistant', content: 'AI response' });
    const { container } = render(<ChatMessageBubble message={msg} />);
    const article = container.querySelector('article');
    expect(article?.style.flexDirection).toBe('row');
  });

  it('renders system message as centered status', () => {
    const msg = makeMessage({ type: 'system', sender: 'system', content: 'Conversation started' });
    render(<ChatMessageBubble message={msg} />);
    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.getByText('Conversation started')).toBeDefined();
  });

  it('renders error message with retry button', () => {
    const onRetry = vi.fn();
    const msg = makeMessage({ type: 'error', sender: 'system', content: 'Connection failed' });
    render(<ChatMessageBubble message={msg} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeDefined();
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledWith('msg-1');
  });

  it('renders citations toggle for assistant messages', () => {
    const msg = makeMessage({
      type: 'assistant',
      sender: 'assistant',
      content: 'Here is the answer.',
      citations: [
        { index: 1, source: 'docs/api.md', excerpt: 'The API provides...', confidence: 0.95 },
        { index: 2, source: 'docs/guide.md', excerpt: 'Guide says...', confidence: 0.8 },
      ],
    });
    render(<ChatMessageBubble message={msg} />);
    expect(screen.getByText('2 sources')).toBeDefined();
  });

  it('renders tool-call with expandable parameters', () => {
    const msg = makeMessage({
      type: 'tool-call',
      sender: 'assistant',
      content: '',
      toolCall: { name: 'search_docs', parameters: { query: 'kailash' }, status: 'done', duration: 450 },
    });
    render(<ChatMessageBubble message={msg} />);
    expect(screen.getByText('search_docs')).toBeDefined();
    expect(screen.getByText('450ms')).toBeDefined();
  });

  it('has accessible article role with label', () => {
    const msg = makeMessage({ sender: 'assistant', type: 'assistant', content: 'Test' });
    const { container } = render(<ChatMessageBubble message={msg} />);
    const article = container.querySelector('article');
    expect(article?.getAttribute('aria-label')).toContain('assistant message');
  });
});

// --- ChatInput ---

describe('ChatInput', () => {
  it('renders textarea with placeholder', () => {
    render(<ChatInput value="" onChange={vi.fn()} onSend={vi.fn()} />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeDefined();
  });

  it('disables send button when empty', () => {
    render(<ChatInput value="" onChange={vi.fn()} onSend={vi.fn()} />);
    const send = screen.getByLabelText('Send message');
    expect(send.getAttribute('disabled')).not.toBeNull();
  });

  it('enables send button when value is non-empty', () => {
    render(<ChatInput value="Hello" onChange={vi.fn()} onSend={vi.fn()} />);
    const send = screen.getByLabelText('Send message');
    expect(send.getAttribute('disabled')).toBeNull();
  });

  it('calls onSend on Cmd+Enter', () => {
    const onSend = vi.fn();
    const { container } = render(<ChatInput value="Hello" onChange={vi.fn()} onSend={onSend} />);
    const textarea = container.querySelector('textarea')!;
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
    expect(onSend).toHaveBeenCalled();
  });

  it('shows attach button when allowAttachments is true', () => {
    render(<ChatInput value="" onChange={vi.fn()} onSend={vi.fn()} allowAttachments />);
    expect(screen.getByLabelText('Attach files')).toBeDefined();
  });

  it('hides attach button by default', () => {
    render(<ChatInput value="" onChange={vi.fn()} onSend={vi.fn()} />);
    expect(screen.queryByLabelText('Attach files')).toBeNull();
  });

  it('has correct aria attributes', () => {
    const { container } = render(<ChatInput value="" onChange={vi.fn()} onSend={vi.fn()} disabled />);
    const textarea = container.querySelector('textarea');
    expect(textarea?.getAttribute('aria-label')).toBe('Message input');
    expect(textarea?.getAttribute('aria-multiline')).toBe('true');
    expect(textarea?.getAttribute('aria-disabled')).toBe('true');
  });
});

// --- StreamOfThought ---

describe('StreamOfThought', () => {
  it('renders steps with status icons', () => {
    const steps: ToolCallStep[] = [
      { id: 's1', name: 'search', status: 'done', duration: 1200, summary: 'Searched 42 docs' },
      { id: 's2', name: 'analyze', status: 'running', summary: 'Analyzing results' },
      { id: 's3', name: 'generate', status: 'queued', summary: 'Generate summary' },
    ];
    render(<StreamOfThought steps={steps} />);
    expect(screen.getByText('Searched 42 docs')).toBeDefined();
    expect(screen.getByText('Analyzing results')).toBeDefined();
    expect(screen.getByText('Generate summary')).toBeDefined();
    expect(screen.getByText('1.2s')).toBeDefined();
    expect(screen.getByText('...')).toBeDefined();
  });

  it('renders nothing when steps are empty', () => {
    const { container } = render(<StreamOfThought steps={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('has status role for accessibility', () => {
    const steps: ToolCallStep[] = [{ id: 's1', name: 'test', status: 'running' }];
    render(<StreamOfThought steps={steps} />);
    expect(screen.getByRole('status')).toBeDefined();
  });
});

// --- ActionPlan ---

describe('ActionPlan', () => {
  const steps: ActionPlanStep[] = [
    { index: 0, description: 'Step one', status: 'pending' },
    { index: 1, description: 'Step two', status: 'pending' },
  ];

  it('renders steps with descriptions', () => {
    render(<ActionPlan steps={steps} onResponse={vi.fn()} />);
    expect(screen.getByText('Step one')).toBeDefined();
    expect(screen.getByText('Step two')).toBeDefined();
  });

  it('shows approve/modify/reject buttons for pending steps', () => {
    render(<ActionPlan steps={steps} onResponse={vi.fn()} />);
    expect(screen.getAllByText('Approve').length).toBe(2);
    expect(screen.getAllByText('Modify').length).toBe(2);
    expect(screen.getAllByText('Reject').length).toBe(2);
  });

  it('calls onResponse with approve action', () => {
    const onResponse = vi.fn();
    render(<ActionPlan steps={steps} onResponse={onResponse} />);
    fireEvent.click(screen.getAllByText('Approve')[0]!);
    expect(onResponse).toHaveBeenCalledWith({ stepIndex: 0, action: 'approve' });
  });

  it('calls onResponse with reject action', () => {
    const onResponse = vi.fn();
    render(<ActionPlan steps={steps} onResponse={onResponse} />);
    fireEvent.click(screen.getAllByText('Reject')[1]!);
    expect(onResponse).toHaveBeenCalledWith({ stepIndex: 1, action: 'reject' });
  });

  it('shows all-reviewed message when no pending steps', () => {
    const resolved: ActionPlanStep[] = [
      { index: 0, description: 'Step one', status: 'approved' },
      { index: 1, description: 'Step two', status: 'rejected' },
    ];
    render(<ActionPlan steps={resolved} onResponse={vi.fn()} />);
    expect(screen.getByText('All steps reviewed')).toBeDefined();
  });

  it('renders nothing when steps are empty', () => {
    const { container } = render(<ActionPlan steps={[]} onResponse={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});

// --- SuggestionChips ---

describe('SuggestionChips', () => {
  const chips: SuggestionChip[] = [
    { label: 'Summarize', value: 'summarize', icon: '📝' },
    { label: 'Translate', value: 'translate' },
  ];

  it('renders chip buttons', () => {
    render(<SuggestionChips suggestions={chips} onSelect={vi.fn()} />);
    expect(screen.getByText('Summarize')).toBeDefined();
    expect(screen.getByText('Translate')).toBeDefined();
  });

  it('calls onSelect when chip clicked', () => {
    const onSelect = vi.fn();
    render(<SuggestionChips suggestions={chips} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Translate'));
    expect(onSelect).toHaveBeenCalledWith({ label: 'Translate', value: 'translate' });
  });

  it('renders nothing when suggestions are empty', () => {
    const { container } = render(<SuggestionChips suggestions={[]} onSelect={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('has accessible group role', () => {
    render(<SuggestionChips suggestions={chips} onSelect={vi.fn()} />);
    const group = screen.getByRole('group');
    expect(group.getAttribute('aria-label')).toBe('Suggested prompts');
  });
});
