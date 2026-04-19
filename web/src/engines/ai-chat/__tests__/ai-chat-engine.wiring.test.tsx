/**
 * AI Chat Engine — Tier 2 wiring test
 *
 * Spec: docs/specs/05-engine-specifications.md § 5.6
 * Rule: .claude/rules/orphan-detection.md MUST Rule 2 + 2a (paired-operation
 * round-trip generalizes to any paired engine surface: sendMessage →
 * onToken/onComplete round-trips with the adapter), and
 * .claude/rules/facade-manager-detection.md MUST Rule 2 (naming convention).
 *
 * Imports ChatEngine + useChatState + types ONLY through the barrel at
 * `../index.ts`. The adapter is a REAL in-memory implementation: a tiny
 * conversation store, real stream handles that dispatch tokens on setTimeout
 * queues, and a real message log. No `vi.fn()` impersonates a method.
 *
 * Paired-operation round-trip: useChatState.sendMessage →
 * adapter.sendMessage → tokens stream → onComplete → message appears in the
 * rendered list. Every half is exercised end-to-end through the public
 * surface; a regression in either half fails the test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ChatEngine,
  useChatState,
  type ChatAdapter,
  type ChatMessage,
  type ChatStreamHandle,
  type ConversationSummary,
} from '../index.js';

// --- Real in-memory ChatAdapter ---

/**
 * Concrete ChatAdapter backed by a conversation store. sendMessage returns
 * a real ChatStreamHandle that delivers tokens via microtask flushes and
 * completes with a canned assistant reply. listConversations / loadMessages
 * /delete /rename all mutate the same store so round-trips are observable.
 */
function createInMemoryChatAdapter(): ChatAdapter & {
  readonly log: Array<{ kind: string; payload: unknown }>;
  readonly store: Map<string, { title: string; messages: ChatMessage[] }>;
} {
  const store = new Map<string, { title: string; messages: ChatMessage[] }>();
  const log: Array<{ kind: string; payload: unknown }> = [];

  // Seed two initial conversations.
  store.set('conv-1', {
    title: 'Existing chat',
    messages: [
      { id: 'm1', type: 'user', content: 'Hi', timestamp: 1, sender: 'user' },
      { id: 'm2', type: 'assistant', content: 'Hello!', timestamp: 2, sender: 'assistant' },
    ],
  });
  store.set('conv-2', {
    title: 'Another chat',
    messages: [],
  });

  const adapter: ChatAdapter = {
    listConversations: async (): Promise<ConversationSummary[]> => {
      log.push({ kind: 'list', payload: null });
      return Array.from(store.entries()).map(([id, c]) => ({
        id,
        title: c.title,
        timestamp: 0,
        messageCount: c.messages.length,
      }));
    },
    loadMessages: async (conversationId: string): Promise<ChatMessage[]> => {
      log.push({ kind: 'load', payload: conversationId });
      return store.get(conversationId)?.messages ?? [];
    },
    sendMessage: (
      conversationId: string | null,
      content: string,
      _attachments?: File[],
      _context?: Record<string, unknown>,
    ): ChatStreamHandle => {
      log.push({ kind: 'send', payload: { conversationId, content } });

      let tokenCb: ((t: string) => void) | null = null;
      let completeCb: ((m: ChatMessage) => void) | null = null;
      let errorCb: ((e: Error) => void) | null = null;
      let aborted = false;

      const reply = `Echo: ${content}`;
      const tokens = reply.split(' ').map((t, i) => (i === 0 ? t : ` ${t}`));

      // Schedule token delivery + completion on a microtask queue so the
      // test's `act` can flush it deterministically.
      queueMicrotask(() => {
        if (aborted) return;
        for (const t of tokens) tokenCb?.(t);
        // Create or reuse the conversation — if conversationId is null this
        // is a brand-new conversation; assign a real id.
        const cid = conversationId ?? `conv-${store.size + 1}`;
        if (!store.has(cid)) {
          store.set(cid, { title: content.slice(0, 30), messages: [] });
        }
        const userMsg: ChatMessage = {
          id: `u-${Date.now()}`,
          type: 'user',
          content,
          timestamp: Date.now(),
          sender: 'user',
        };
        const assistantMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          type: 'assistant',
          content: reply,
          timestamp: Date.now(),
          sender: 'assistant',
          meta: { conversationId: cid },
        };
        store.get(cid)!.messages.push(userMsg, assistantMsg);
        completeCb?.(assistantMsg);
      });

      return {
        onToken(cb) { tokenCb = cb; },
        onComplete(cb) { completeCb = cb; },
        onError(cb) { errorCb = cb; void errorCb; /* retained for completeness */ },
        abort() { aborted = true; },
      };
    },
    deleteConversation: async (id) => {
      log.push({ kind: 'delete', payload: id });
      store.delete(id);
    },
    renameConversation: async (id, title) => {
      log.push({ kind: 'rename', payload: { id, title } });
      const c = store.get(id);
      if (c) c.title = title;
    },
  };

  return Object.assign(adapter, { log, store });
}

// --- Test setup ---

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// --- Tests ---

describe('AI Chat engine — barrel wiring', () => {
  it('re-exports public surface through the barrel', () => {
    expect(typeof ChatEngine).toBe('function');
    expect(typeof useChatState).toBe('function');
  });

  it('useChatState loads conversations from a real adapter on mount', async () => {
    const adapter = createInMemoryChatAdapter();
    const { result } = renderHook(() => useChatState({ adapter }));

    await waitFor(() => {
      expect(result.current.conversations.length).toBe(2);
    });
    const titles = result.current.conversations.map((c) => c.title).sort();
    expect(titles).toEqual(['Another chat', 'Existing chat']);

    // Adapter's listConversations was actually called (observable via log).
    expect(adapter.log.some((e) => e.kind === 'list')).toBe(true);
  });

  it('switching a conversation loads its messages through the adapter', async () => {
    const adapter = createInMemoryChatAdapter();
    const { result } = renderHook(() => useChatState({ adapter }));

    await waitFor(() => expect(result.current.conversations.length).toBe(2));

    await act(async () => {
      result.current.switchConversation('conv-1');
    });

    await waitFor(() => {
      expect(result.current.messages.length).toBe(2);
      expect(result.current.messages[0]?.content).toBe('Hi');
      expect(result.current.messages[1]?.content).toBe('Hello!');
    });

    // Adapter's loadMessages fired for conv-1 specifically.
    const loadEntry = adapter.log.find((e) => e.kind === 'load');
    expect(loadEntry?.payload).toBe('conv-1');
  });

  it('round-trips: sendMessage → adapter tokens → onComplete → assistant reply in state', async () => {
    const adapter = createInMemoryChatAdapter();
    const { result } = renderHook(() => useChatState({ adapter }));

    await waitFor(() => expect(result.current.conversations.length).toBe(2));

    // User sends a message in a brand-new (null) conversation.
    await act(async () => {
      result.current.sendMessage('ping');
    });

    // Flush microtasks so the adapter's scheduled tokens + complete deliver.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // User message appended optimistically + assistant reply from onComplete.
    await waitFor(() => {
      expect(result.current.messages.length).toBe(2);
      expect(result.current.messages[0]?.content).toBe('ping');
      expect(result.current.messages[1]?.content).toBe('Echo: ping');
      expect(result.current.isStreaming).toBe(false);
    });

    // Adapter store persisted the exchange (read-back).
    const newConvEntry = Array.from(adapter.store.entries()).find(
      ([_, c]) => c.messages.some((m) => m.content === 'Echo: ping'),
    );
    expect(newConvEntry).toBeDefined();
  });

  it('ChatEngine renders messages from useChatState through the public barrel', async () => {
    const adapter = createInMemoryChatAdapter();

    function Harness() {
      const chat = useChatState({ adapter });
      return (
        <ChatEngine
          messages={chat.messages}
          isStreaming={chat.isStreaming}
          streamBuffer={chat.streamBuffer}
          onSend={(msg) => chat.sendMessage(msg.content)}
        />
      );
    }

    render(<Harness />);

    // Empty state initially.
    expect(screen.getByText(/Start a conversation/i)).toBeDefined();

    // User types into the real rendered ChatInput and presses Send.
    const input = screen.getByLabelText('Message input') as HTMLTextAreaElement;
    await act(async () => {
      fireEvent.change(input, { target: { value: 'hello world' } });
    });
    const sendBtn = screen.getByRole('button', { name: /send message/i });
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    // Flush microtasks for adapter's stream delivery.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // User-visible effect: the user message + the assistant echo both render.
    await waitFor(() => {
      expect(screen.getByText('hello world')).toBeDefined();
      expect(screen.getByText('Echo: hello world')).toBeDefined();
    });

    // Adapter received the send call (observable via log).
    const sendEntry = adapter.log.find((e) => e.kind === 'send');
    expect(sendEntry).toBeDefined();
    expect((sendEntry!.payload as { content: string }).content).toBe('hello world');
  });

  it('rename + delete round-trip through the adapter updates useChatState', async () => {
    const adapter = createInMemoryChatAdapter();
    const { result } = renderHook(() => useChatState({ adapter }));

    await waitFor(() => expect(result.current.conversations.length).toBe(2));

    // Rename conv-1 → observe in state AND in the adapter's store.
    await act(async () => {
      await result.current.renameConversation('conv-1', 'Renamed chat');
    });
    await waitFor(() => {
      const renamed = result.current.conversations.find((c) => c.id === 'conv-1');
      expect(renamed?.title).toBe('Renamed chat');
    });
    expect(adapter.store.get('conv-1')?.title).toBe('Renamed chat');

    // Delete conv-2 → observe in state AND in the adapter's store.
    await act(async () => {
      await result.current.deleteConversation('conv-2');
    });
    await waitFor(() => {
      expect(result.current.conversations.find((c) => c.id === 'conv-2')).toBeUndefined();
    });
    expect(adapter.store.has('conv-2')).toBe(false);
  });
});
