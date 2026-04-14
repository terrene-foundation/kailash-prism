/**
 * useChatState — Transport-agnostic chat state management
 * Spec: docs/specs/05-engine-specifications.md § 5.6
 *
 * Manages conversations, messages, and streaming state.
 * Consumer provides a ChatAdapter to connect to their backend.
 * Returns state + actions that map directly to ChatEngine and
 * ConversationSidebar props.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ChatAdapter,
  ChatStreamHandle,
  ChatMessage,
  ConversationSummary,
} from './types.js';

export interface ChatStateOptions {
  /** The backend adapter */
  adapter: ChatAdapter;
  /** Auto-load conversations on mount. Default: true */
  autoLoad?: boolean;
  /** Polling interval in ms for conversation list. 0 = disabled. Default: 0 */
  pollInterval?: number;
}

export interface ChatStateValue {
  /** All conversations */
  conversations: ConversationSummary[];
  /** Currently active conversation ID */
  activeConversationId: string | null;
  /** Messages for the active conversation */
  messages: ChatMessage[];
  /** Whether a response is streaming */
  isStreaming: boolean;
  /** Accumulated stream buffer text */
  streamBuffer: string;
  /** Whether conversations are loading */
  isLoadingConversations: boolean;
  /** Whether messages are loading */
  isLoadingMessages: boolean;
  /** Last error, if any */
  error: Error | null;

  /** Switch to an existing conversation */
  switchConversation: (id: string) => void;
  /** Start a new conversation (clears active) */
  startNewConversation: () => void;
  /** Send a message in the active (or new) conversation */
  sendMessage: (content: string, attachments?: File[], context?: Record<string, unknown>) => void;
  /** Stop the current stream */
  stopStreaming: () => void;
  /** Delete a conversation */
  deleteConversation: (id: string) => Promise<void>;
  /** Rename a conversation */
  renameConversation: (id: string, title: string) => Promise<void>;
  /** Manually refresh the conversation list */
  refreshConversations: () => Promise<void>;
}

export function useChatState(options: ChatStateOptions): ChatStateValue {
  const { adapter, autoLoad = true, pollInterval = 0 } = options;

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const streamRef = useRef<ChatStreamHandle | null>(null);
  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  // --- Load conversations ---

  const refreshConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const result = await adapterRef.current.listConversations();
      setConversations(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      refreshConversations();
    }
  }, [autoLoad, refreshConversations]);

  // Polling
  useEffect(() => {
    if (pollInterval <= 0) return;
    const id = setInterval(refreshConversations, pollInterval);
    return () => clearInterval(id);
  }, [pollInterval, refreshConversations]);

  // --- Load messages when conversation changes ---

  useEffect(() => {
    if (activeConversationId === null) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setIsLoadingMessages(true);

    adapterRef.current
      .loadMessages(activeConversationId)
      .then((msgs) => {
        if (!cancelled) {
          setMessages(msgs);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeConversationId]);

  // --- Actions ---

  const switchConversation = useCallback((id: string) => {
    // Abort any active stream when switching
    if (streamRef.current) {
      streamRef.current.abort();
      streamRef.current = null;
    }
    setIsStreaming(false);
    setStreamBuffer('');
    setActiveConversationId(id);
  }, []);

  const startNewConversation = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.abort();
      streamRef.current = null;
    }
    setIsStreaming(false);
    setStreamBuffer('');
    setActiveConversationId(null);
    setMessages([]);
  }, []);

  const sendMessage = useCallback(
    (content: string, attachments?: File[], context?: Record<string, unknown>) => {
      if (!content.trim()) return;

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: content.trim(),
        timestamp: Date.now(),
        sender: 'user',
      };
      setMessages((prev) => [...prev, userMessage]);

      // Start streaming
      setIsStreaming(true);
      setStreamBuffer('');
      setError(null);

      const handle = adapterRef.current.sendMessage(
        activeConversationId,
        content.trim(),
        attachments,
        context,
      );
      streamRef.current = handle;

      let buffer = '';

      handle.onToken((token) => {
        buffer += token;
        setStreamBuffer(buffer);
      });

      handle.onComplete((assistantMessage) => {
        streamRef.current = null;
        setIsStreaming(false);
        setStreamBuffer('');
        setMessages((prev) => [...prev, assistantMessage]);

        // If this was a new conversation, extract the backend-assigned
        // conversation ID from meta and set it as active. This prevents
        // the race where refreshConversations arrives before the state
        // update, and subsequent messages go to null instead of the new ID.
        if (activeConversationId === null) {
          const newId = assistantMessage.meta?.conversationId as string | undefined;
          if (newId) {
            setActiveConversationId(newId);
          }
          refreshConversations();
        }
      });

      handle.onError((err) => {
        streamRef.current = null;
        setIsStreaming(false);
        setStreamBuffer('');
        setError(err);

        // Add error message
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            type: 'error',
            content: err.message,
            timestamp: Date.now(),
            sender: 'system',
          },
        ]);
      });
    },
    [activeConversationId, refreshConversations],
  );

  const stopStreaming = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.abort();
      streamRef.current = null;
    }
    setIsStreaming(false);
    // Keep the buffer as a partial message
    if (streamBuffer) {
      setMessages((prev) => [
        ...prev,
        {
          id: `partial-${Date.now()}`,
          type: 'assistant',
          content: streamBuffer,
          timestamp: Date.now(),
          sender: 'assistant',
        },
      ]);
      setStreamBuffer('');
    }
  }, [streamBuffer]);

  const deleteConversation = useCallback(
    async (id: string) => {
      await adapterRef.current.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    },
    [activeConversationId],
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await adapterRef.current.renameConversation(id, title);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c)),
      );
    },
    [],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.abort();
      }
    };
  }, []);

  return {
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    streamBuffer,
    isLoadingConversations,
    isLoadingMessages,
    error,
    switchConversation,
    startNewConversation,
    sendMessage,
    stopStreaming,
    deleteConversation,
    renameConversation,
    refreshConversations,
  };
}
