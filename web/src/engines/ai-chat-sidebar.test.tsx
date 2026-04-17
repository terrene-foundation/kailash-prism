/**
 * ConversationSidebar + useChatState — Tests
 * Covers: date grouping, search, rename, delete, collapsed mode,
 * renderMeta, useChatState conversation switching, streaming, message management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook, waitFor } from '@testing-library/react';
import { ConversationSidebar } from './ai-chat/conversation-sidebar.js';
import { useChatState } from './ai-chat/use-chat-state.js';
import type {
  ConversationSummary,
  ChatAdapter,
  ChatStreamHandle,
  ChatMessage,
} from './ai-chat/types.js';

// --- Fixtures ---

const NOW = new Date(2026, 3, 14, 14, 0, 0).getTime(); // 2026-04-14 14:00

function makeConversation(overrides?: Partial<ConversationSummary>): ConversationSummary {
  return {
    id: 'conv-1',
    title: 'Test Conversation',
    lastMessage: 'Hello there',
    timestamp: NOW,
    messageCount: 5,
    ...overrides,
  };
}

function makeConversations(): ConversationSummary[] {
  return [
    makeConversation({ id: 'conv-1', title: 'Today chat', timestamp: NOW }),
    makeConversation({
      id: 'conv-2',
      title: 'Yesterday chat',
      timestamp: NOW - 2 * 24 * 60 * 60 * 1000,
      lastMessage: 'Previous discussion',
    }),
    makeConversation({
      id: 'conv-3',
      title: 'Old chat',
      timestamp: NOW - 14 * 24 * 60 * 60 * 1000,
      lastMessage: 'Way back when',
    }),
  ];
}

function mockStreamHandle(): ChatStreamHandle {
  let tokenCb: ((token: string) => void) | null = null;
  let completeCb: ((msg: ChatMessage) => void) | null = null;
  let errorCb: ((err: Error) => void) | null = null;

  return {
    onToken(cb) { tokenCb = cb; },
    onComplete(cb) { completeCb = cb; },
    onError(cb) { errorCb = cb; },
    abort: vi.fn(),
    // Test helpers (not part of the interface — attached for test access)
    _emitToken(t: string) { tokenCb?.(t); },
    _emitComplete(msg: ChatMessage) { completeCb?.(msg); },
    _emitError(err: Error) { errorCb?.(err); },
  } as ChatStreamHandle & {
    _emitToken: (t: string) => void;
    _emitComplete: (msg: ChatMessage) => void;
    _emitError: (err: Error) => void;
  };
}

function mockAdapter(overrides?: Partial<ChatAdapter>): ChatAdapter {
  return {
    listConversations: vi.fn().mockResolvedValue(makeConversations()),
    loadMessages: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockReturnValue(mockStreamHandle()),
    deleteConversation: vi.fn().mockResolvedValue(undefined),
    renameConversation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// --- ConversationSidebar ---

describe('ConversationSidebar', () => {
  const conversations = makeConversations();
  const defaultProps = {
    conversations,
    activeId: null as string | null,
    onSelect: vi.fn(),
    onNew: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Freeze "now" for date grouping
    vi.useFakeTimers({ now: NOW });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders conversations with date groups', () => {
      render(<ConversationSidebar {...defaultProps} />);
      expect(screen.getByText('Today')).toBeDefined();
      expect(screen.getByText('This Week')).toBeDefined();
      expect(screen.getByText('Earlier')).toBeDefined();
      expect(screen.getByText('Today chat')).toBeDefined();
      expect(screen.getByText('Yesterday chat')).toBeDefined();
      expect(screen.getByText('Old chat')).toBeDefined();
    });

    it('renders "No conversations yet" when list is empty', () => {
      render(<ConversationSidebar {...defaultProps} conversations={[]} />);
      expect(screen.getByText('No conversations yet')).toBeDefined();
    });

    it('has navigation role and label', () => {
      render(<ConversationSidebar {...defaultProps} />);
      expect(screen.getByRole('navigation')).toBeDefined();
      expect(screen.getByLabelText('Conversation list')).toBeDefined();
    });

    it('highlights active conversation', () => {
      const { container } = render(<ConversationSidebar {...defaultProps} activeId="conv-1" />);
      const active = container.querySelector('[aria-current="true"]');
      expect(active).toBeDefined();
      expect(active?.textContent).toContain('Today chat');
    });

    it('shows last message preview', () => {
      render(<ConversationSidebar {...defaultProps} />);
      expect(screen.getByText('Hello there')).toBeDefined();
      expect(screen.getByText('Previous discussion')).toBeDefined();
    });

    it('renders custom meta via renderMeta', () => {
      const renderMeta = (conv: ConversationSummary) => (
        <span data-testid={`meta-${conv.id}`}>badge</span>
      );
      render(<ConversationSidebar {...defaultProps} renderMeta={renderMeta} />);
      expect(screen.getByTestId('meta-conv-1')).toBeDefined();
      expect(screen.getByTestId('meta-conv-2')).toBeDefined();
    });
  });

  describe('Search', () => {
    it('filters conversations by title', () => {
      render(<ConversationSidebar {...defaultProps} />);
      const search = screen.getByLabelText('Search conversations');
      fireEvent.change(search, { target: { value: 'Old' } });
      expect(screen.getByText('Old chat')).toBeDefined();
      expect(screen.queryByText('Today chat')).toBeNull();
    });

    it('filters by last message content', () => {
      render(<ConversationSidebar {...defaultProps} />);
      const search = screen.getByLabelText('Search conversations');
      fireEvent.change(search, { target: { value: 'Previous' } });
      expect(screen.getByText('Yesterday chat')).toBeDefined();
      expect(screen.queryByText('Today chat')).toBeNull();
    });

    it('shows "No matching conversations" when search has no results', () => {
      render(<ConversationSidebar {...defaultProps} />);
      const search = screen.getByLabelText('Search conversations');
      fireEvent.change(search, { target: { value: 'nonexistent' } });
      expect(screen.getByText('No matching conversations')).toBeDefined();
    });
  });

  describe('Actions', () => {
    it('calls onSelect when conversation clicked', () => {
      const onSelect = vi.fn();
      render(<ConversationSidebar {...defaultProps} onSelect={onSelect} />);
      fireEvent.click(screen.getByText('Today chat'));
      expect(onSelect).toHaveBeenCalledWith('conv-1');
    });

    it('calls onNew when New button clicked', () => {
      const onNew = vi.fn();
      render(<ConversationSidebar {...defaultProps} onNew={onNew} />);
      fireEvent.click(screen.getByLabelText('New conversation'));
      expect(onNew).toHaveBeenCalled();
    });

    it('opens context menu on three-dot click', () => {
      render(
        <ConversationSidebar {...defaultProps} onDelete={vi.fn()} onRename={vi.fn()} />,
      );
      const menuBtns = screen.getAllByLabelText(/Actions for/);
      fireEvent.click(menuBtns[0]!);
      expect(screen.getByRole('menu')).toBeDefined();
      expect(screen.getByText('Rename')).toBeDefined();
      expect(screen.getByText('Delete')).toBeDefined();
    });
  });

  describe('Rename', () => {
    it('shows rename input when Rename is clicked from menu', () => {
      render(
        <ConversationSidebar {...defaultProps} onRename={vi.fn()} />,
      );
      // Open menu for first conversation
      const menuBtn = screen.getAllByLabelText(/Actions for/)[0]!;
      fireEvent.click(menuBtn);
      fireEvent.click(screen.getByText('Rename'));
      expect(screen.getByLabelText('Rename conversation')).toBeDefined();
    });

    it('calls onRename when Enter pressed in rename input', () => {
      const onRename = vi.fn();
      render(<ConversationSidebar {...defaultProps} onRename={onRename} />);
      const menuBtn = screen.getAllByLabelText(/Actions for/)[0]!;
      fireEvent.click(menuBtn);
      fireEvent.click(screen.getByText('Rename'));
      const input = screen.getByLabelText('Rename conversation');
      fireEvent.change(input, { target: { value: 'New Title' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onRename).toHaveBeenCalledWith('conv-1', 'New Title');
    });

    it('cancels rename on Escape', () => {
      render(<ConversationSidebar {...defaultProps} onRename={vi.fn()} />);
      const menuBtn = screen.getAllByLabelText(/Actions for/)[0]!;
      fireEvent.click(menuBtn);
      fireEvent.click(screen.getByText('Rename'));
      const input = screen.getByLabelText('Rename conversation');
      fireEvent.keyDown(input, { key: 'Escape' });
      // Should go back to showing the title
      expect(screen.getByText('Today chat')).toBeDefined();
    });
  });

  describe('Delete', () => {
    it('shows delete confirmation when Delete clicked from menu', () => {
      render(<ConversationSidebar {...defaultProps} onDelete={vi.fn()} />);
      const menuBtn = screen.getAllByLabelText(/Actions for/)[0]!;
      fireEvent.click(menuBtn);
      fireEvent.click(screen.getByText('Delete'));
      expect(screen.getByText('Delete?')).toBeDefined();
      expect(screen.getByText('Yes')).toBeDefined();
      expect(screen.getByText('No')).toBeDefined();
    });

    it('calls onDelete when confirmed', () => {
      const onDelete = vi.fn();
      render(<ConversationSidebar {...defaultProps} onDelete={onDelete} />);
      const menuBtn = screen.getAllByLabelText(/Actions for/)[0]!;
      fireEvent.click(menuBtn);
      fireEvent.click(screen.getByText('Delete'));
      fireEvent.click(screen.getByText('Yes'));
      expect(onDelete).toHaveBeenCalledWith('conv-1');
    });

    it('cancels delete when No clicked', () => {
      const onDelete = vi.fn();
      render(<ConversationSidebar {...defaultProps} onDelete={onDelete} />);
      const menuBtn = screen.getAllByLabelText(/Actions for/)[0]!;
      fireEvent.click(menuBtn);
      fireEvent.click(screen.getByText('Delete'));
      fireEvent.click(screen.getByText('No'));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });

  describe('Collapsed mode', () => {
    it('renders collapsed strip with expand and new buttons', () => {
      render(<ConversationSidebar {...defaultProps} collapsed onToggleCollapse={vi.fn()} />);
      expect(screen.getByLabelText('Expand conversation list')).toBeDefined();
      expect(screen.getByLabelText('New conversation')).toBeDefined();
      // Should NOT show the full list
      expect(screen.queryByText('Today chat')).toBeNull();
    });

    it('calls onToggleCollapse when expand clicked', () => {
      const onToggle = vi.fn();
      render(<ConversationSidebar {...defaultProps} collapsed onToggleCollapse={onToggle} />);
      fireEvent.click(screen.getByLabelText('Expand conversation list'));
      expect(onToggle).toHaveBeenCalled();
    });
  });
});

// --- useChatState ---

describe('useChatState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads conversations on mount when autoLoad is true', async () => {
    const adapter = mockAdapter();
    const { result } = renderHook(() => useChatState({ adapter }));

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(3);
    });
    expect(adapter.listConversations).toHaveBeenCalledOnce();
  });

  it('does not load on mount when autoLoad is false', async () => {
    const adapter = mockAdapter();
    renderHook(() => useChatState({ adapter, autoLoad: false }));

    // Give it a tick
    await act(async () => {});
    expect(adapter.listConversations).not.toHaveBeenCalled();
  });

  it('loads messages when switching conversations', async () => {
    const messages: ChatMessage[] = [
      { id: 'msg-1', type: 'user', content: 'Hello', timestamp: Date.now(), sender: 'user' },
    ];
    const adapter = mockAdapter({
      loadMessages: vi.fn().mockResolvedValue(messages),
    });

    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    act(() => {
      result.current.switchConversation('conv-1');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0]!.content).toBe('Hello');
    });
    expect(adapter.loadMessages).toHaveBeenCalledWith('conv-1');
  });

  it('clears messages when starting new conversation', async () => {
    const adapter = mockAdapter({
      loadMessages: vi.fn().mockResolvedValue([
        { id: 'msg-1', type: 'user', content: 'Hello', timestamp: Date.now(), sender: 'user' },
      ]),
    });

    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    // Switch to a conversation to load messages
    act(() => { result.current.switchConversation('conv-1'); });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    // Start new conversation
    act(() => { result.current.startNewConversation(); });
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('adds user message optimistically on send', async () => {
    const handle = mockStreamHandle();
    const adapter = mockAdapter({
      sendMessage: vi.fn().mockReturnValue(handle),
    });

    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    act(() => {
      result.current.sendMessage('Test message');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]!.content).toBe('Test message');
    expect(result.current.messages[0]!.sender).toBe('user');
    expect(result.current.isStreaming).toBe(true);
  });

  it('accumulates stream buffer from tokens', async () => {
    const handle = mockStreamHandle() as ReturnType<typeof mockStreamHandle>;
    const adapter = mockAdapter({
      sendMessage: vi.fn().mockReturnValue(handle),
    });

    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    act(() => { result.current.sendMessage('Hello'); });

    act(() => { (handle as any)._emitToken('Hello '); });
    expect(result.current.streamBuffer).toBe('Hello ');

    act(() => { (handle as any)._emitToken('world!'); });
    expect(result.current.streamBuffer).toBe('Hello world!');
  });

  it('finalizes message on stream complete', async () => {
    const handle = mockStreamHandle() as ReturnType<typeof mockStreamHandle>;
    const adapter = mockAdapter({
      sendMessage: vi.fn().mockReturnValue(handle),
    });

    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    act(() => { result.current.sendMessage('Hello'); });
    act(() => { (handle as any)._emitToken('Response'); });

    const assistantMsg: ChatMessage = {
      id: 'msg-a1',
      type: 'assistant',
      content: 'Response text',
      timestamp: Date.now(),
      sender: 'assistant',
    };

    // onComplete triggers refreshConversations() when activeConversationId is null;
    // wait for that async effect to settle so state updates stay inside act().
    await act(async () => {
      (handle as any)._emitComplete(assistantMsg);
    });
    await waitFor(() => {
      expect(result.current.isStreaming).toBe(false);
    });

    expect(result.current.streamBuffer).toBe('');
    // User message + assistant message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]!.content).toBe('Response text');
  });

  it('handles stream errors', async () => {
    const handle = mockStreamHandle() as ReturnType<typeof mockStreamHandle>;
    const adapter = mockAdapter({
      sendMessage: vi.fn().mockReturnValue(handle),
    });

    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    act(() => { result.current.sendMessage('Hello'); });
    act(() => { (handle as any)._emitError(new Error('Connection lost')); });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.error?.message).toBe('Connection lost');
    // User message + error message
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]!.type).toBe('error');
  });

  it('deletes conversation and clears if active', async () => {
    const adapter = mockAdapter();
    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    act(() => { result.current.switchConversation('conv-1'); });

    await act(async () => {
      await result.current.deleteConversation('conv-1');
    });

    expect(adapter.deleteConversation).toHaveBeenCalledWith('conv-1');
    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.activeConversationId).toBeNull();
  });

  it('renames conversation in local state', async () => {
    const adapter = mockAdapter();
    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    await act(async () => {
      await result.current.renameConversation('conv-1', 'Renamed');
    });

    expect(adapter.renameConversation).toHaveBeenCalledWith('conv-1', 'Renamed');
    expect(result.current.conversations.find((c) => c.id === 'conv-1')?.title).toBe('Renamed');
  });

  it('does not send empty messages', async () => {
    const adapter = mockAdapter();
    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    act(() => { result.current.sendMessage('   '); });
    expect(adapter.sendMessage).not.toHaveBeenCalled();
  });

  it('aborts stream when switching conversations', async () => {
    const handle = mockStreamHandle();
    const adapter = mockAdapter({
      sendMessage: vi.fn().mockReturnValue(handle),
    });

    const { result } = renderHook(() => useChatState({ adapter }));
    await waitFor(() => expect(result.current.conversations).toHaveLength(3));

    act(() => { result.current.sendMessage('Hello'); });
    expect(result.current.isStreaming).toBe(true);

    // switchConversation triggers an effect that loads messages for the new
    // conversation via the adapter; wait for that async load to settle so the
    // downstream setIsLoadingMessages(false) runs inside act().
    await act(async () => {
      result.current.switchConversation('conv-2');
    });
    await waitFor(() => {
      expect(result.current.isLoadingMessages).toBe(false);
    });

    expect(handle.abort).toHaveBeenCalled();
    expect(result.current.isStreaming).toBe(false);
  });
});
