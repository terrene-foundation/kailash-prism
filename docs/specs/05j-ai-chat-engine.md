# AI Chat Engine — Core (§5.6)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.6 AI Chat Engine

**Purpose**: Renders a complete AI conversation interface with streaming messages, tool call visualization, citations, action plans, and conversation management — purpose-built for Kailash Kaizen agent applications.

### Props/Configuration

```typescript
interface ChatEngineConfig {
  // Connection
  endpoint: string;               // WebSocket or HTTP streaming endpoint.
  protocol: "websocket" | "sse";  // Default: "sse" (Server-Sent Events).

  // Conversation
  conversationId?: string;        // Resume existing conversation. Null for new.
  systemPrompt?: string;          // System prompt (hidden from user, sent with each request).

  // Message types enabled
  features?: {
    citations: boolean;           // Default: true. Show inline citations with source panel.
    toolCalls: boolean;           // Default: true. Show tool call visualization.
    actionPlans: boolean;         // Default: true. Show approve/modify/reject action plans.
    branching: boolean;           // Default: false. Allow conversation branching (edit + re-submit).
    search: boolean;              // Default: true. Search within conversation history.
    pinning: boolean;             // Default: false. Pin important messages.
    attachments: boolean;         // Default: false. Allow file attachments in input.
    suggestions: boolean;         // Default: true. Show suggestion chips.
    templates: boolean;           // Default: false. Show prompt templates.
  };

  // Input configuration
  input?: {
    placeholder?: string;         // Default: "Type a message..."
    maxLength?: number;           // Default: 10000 characters.
    allowedAttachmentTypes?: string[]; // MIME types for attachments.
    maxAttachmentSize?: number;   // Max file size in bytes. Default: 10MB (10485760).
    maxAttachments?: number;      // Default: 5.
    sources?: SourceOption[];     // Data source selector options (e.g., "All docs", "Company wiki").
  };

  // Display
  avatars?: {
    user?: string | Component;    // User avatar (URL or custom component).
    assistant?: string | Component; // Assistant avatar.
  };
  messageGrouping?: {
    enabled: boolean;             // Default: true. Group consecutive same-sender messages.
    maxGapMs: number;             // Default: 60000. Messages more than this apart are separate groups.
  };

  // Conversation list (sidebar)
  conversationList?: {
    enabled: boolean;             // Default: true.
    source: string;               // API endpoint for conversation list.
    groupBy?: "date" | "topic";   // Default: "date" (Today, Yesterday, Last 7 days, Older).
  };
}

interface SourceOption {
  id: string;
  label: string;
  icon?: string;
  description?: string;
}
```

### Message Types

Each message in the conversation has a type that determines its rendering:

| Type | Description | Rendered As |
|------|-------------|-------------|
| `user` | User's input message. | Right-aligned bubble (web) or full-width with user avatar (Flutter). |
| `assistant` | AI response (complete). | Left-aligned with assistant avatar. Supports markdown rendering. |
| `assistant-streaming` | AI response (in progress). | Same as `assistant` but with cursor animation at the end. Tokens append in real-time. |
| `system` | System message (e.g., "Conversation started", "Agent switched"). | Centered, muted text, no avatar. |
| `tool-call` | AI invoked a tool. | Inline collapsible block showing tool name + parameters. |
| `tool-result` | Tool returned a result. | Inline collapsible block showing result summary + full data on expand. |
| `error` | Error message. | AlertBanner variant (`error`) with optional retry button. |
| `citation-reference` | Inline citation marker. | Superscript number that opens citation panel on click. |

**Message schema**:
```typescript
interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;                // Markdown content (for user/assistant). Tool JSON (for tool-call/result).
  timestamp: number;              // Unix ms.
  sender: "user" | "assistant" | "system";

  // Citations (assistant messages only)
  citations?: Citation[];

  // Tool calls (tool-call messages only)
  toolCall?: {
    name: string;
    parameters: Record<string, any>;
    status: "queued" | "running" | "done" | "error";
    duration?: number;            // Execution time in ms.
  };

  // Tool results (tool-result messages only)
  toolResult?: {
    summary: string;              // One-line summary shown inline.
    data: any;                    // Full result data shown on expand.
    success: boolean;
  };

  // Branch metadata
  parentId?: string;              // If this message is a branch, the parent message ID.
  branchIndex?: number;           // Branch number (0 = original, 1+ = branches).

  // Domain-specific metadata
  meta?: Record<string, unknown>; // Extensible metadata (e.g. riskTier, confidenceScore, conversationId).
                                  // Adapters set meta.conversationId on complete events so useChatState
                                  // can track new conversation IDs without a racy refresh.
}

interface Citation {
  index: number;                  // Display number (1-indexed).
  source: string;                 // Source document/URL.
  excerpt: string;                // Relevant excerpt from the source.
  confidence?: number;            // 0-1. Displayed as percentage.
  page?: number;                  // Page number if applicable.
}
```

### Internal State

| State | Type | Description |
|-------|------|-------------|
| `messages` | `ChatMessage[]` | All messages in the current conversation. |
| `isStreaming` | `boolean` | True while receiving a streaming response. |
| `streamBuffer` | `string` | Accumulated tokens of the in-progress response. |
| `conversations` | `ConversationSummary[]` | List of user's conversations (for sidebar). |
| `activeConversationId` | `string \| null` | Currently viewed conversation. |
| `inputValue` | `string` | Current input field value. |
| `attachments` | `File[]` | Files attached to the current input. |
| `selectedSource` | `string \| null` | Selected data source filter. |
| `citationPanelOpen` | `boolean` | Whether the citation side panel is visible. |
| `activeCitation` | `Citation \| null` | Currently highlighted citation. |
| `toolCallSteps` | `ToolCallStep[]` | Accumulated tool call steps for StreamOfThought display. |
| `actionPlan` | `ActionPlanStep[] \| null` | Current action plan awaiting user approval. |
| `searchQuery` | `string` | Conversation search query. |
| `searchResults` | `ChatMessage[]` | Messages matching search query. |

### Events/Callbacks

| Event | Payload | When Emitted |
|-------|---------|-------------|
| `onSend` | `{ content: string; attachments: File[]; source?: string }` | User sends a message. |
| `onStreamStart` | `{ conversationId: string }` | Streaming response begins. |
| `onStreamToken` | `string` | Each token received during streaming. |
| `onStreamEnd` | `{ message: ChatMessage }` | Streaming response completes. |
| `onToolCallStart` | `ToolCallStep` | A tool call begins execution. |
| `onToolCallEnd` | `ToolCallStep` | A tool call completes. |
| `onCitationClick` | `Citation` | User clicks a citation marker. |
| `onActionPlanResponse` | `{ stepIndex: number; action: "approve" \| "modify" \| "reject"; modification?: string }` | User responds to an action plan step. |
| `onConversationSwitch` | `{ from: string; to: string }` | User switches to a different conversation. |
| `onConversationCreate` | `string` | New conversation created (returns new ID). |
| `onBranch` | `{ messageId: string; newContent: string }` | User edits a message and re-submits (creating a branch). |
| `onError` | `{ error: string; recoverable: boolean }` | Connection error or server error. |

### Composition Points

| Slot | Purpose | Default |
|------|---------|---------|
| `messageRenderer[type]` | Custom renderer for a specific message type. | Default renderers per type (see Message Types). |
| `inputArea` | Custom input area replacement. | TextArea + attachment button + source selector + send button. |
| `conversationListItem` | Custom conversation list item. | Title + last message preview + timestamp. |
| `streamOfThought` | Custom StreamOfThought visualization. | Vertical step list with status icons. |
| `actionPlanStep` | Custom action plan step renderer. | Numbered step with description + approve/modify/reject buttons. |
| `citationCard` | Custom citation panel card. | Source title + excerpt + confidence badge + page number. |
| `suggestionChips` | Custom suggestion chip layout. | Horizontal scrollable row of chip buttons. |
| `emptyConversation` | Content shown when conversation has no messages. | Welcome message + suggestion chips. |
| `headerBar` | Content in the chat header (conversation title, actions). | Conversation title + search button + settings button. |
| `renderMessageActions` | Custom action buttons per message (e.g. feedback, escalation, risk badge). | None (no default actions). |

### Transport Adapter

The ChatAdapter interface decouples the chat engine from any specific backend:

```typescript
interface ChatAdapter {
  listConversations(): Promise<ConversationSummary[]>;
  loadMessages(conversationId: string): Promise<ChatMessage[]>;
  sendMessage(conversationId: string | null, content: string, attachments?: File[]): ChatStreamHandle;
  deleteConversation(id: string): Promise<void>;
  renameConversation(id: string, title: string): Promise<void>;
}

interface ChatStreamHandle {
  onToken(callback: (token: string) => void): void;
  onComplete(callback: (message: ChatMessage) => void): void;
  onError(callback: (error: Error) => void): void;
  abort(): void;
}

interface ConversationSummary {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: number;     // Unix ms.
  messageCount: number;
  meta?: Record<string, unknown>;  // Domain-specific (e.g. riskTier).
}
```

**ID contract**: All IDs are `string`. Backends using numeric IDs (e.g. arbor advisory) convert in their adapter. The `onComplete` message should set `meta.conversationId` when a new conversation is created so the state manager can track it.

