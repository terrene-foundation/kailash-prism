# AI Chat Engine — Streaming, Tools, Citations (§5.6 cont.)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

### State Management (useChatState / KChatState)

Transport-agnostic state management provided as a React hook (`useChatState`) and Flutter ChangeNotifier (`KChatState`). Manages conversations, messages, streaming buffer, and conversation CRUD. Consumer passes a ChatAdapter; the hook wires everything internally.

### ConversationTemplate Wired Mode

The ConversationTemplate supports two modes:

1. **Wired mode**: Pass `adapter: ChatAdapter` and the template internally composes ConversationSidebar, ChatEngine, and useChatState. Consumers customize via `renderMeta` (domain badges per conversation), `renderMessageActions` (per-message actions like feedback), and `renderContent`/`renderSidebar` overrides.

2. **Manual mode**: Pass `conversationList` and `content` as ReactNode/Widget for full control.

The template auto-wraps with LayoutProvider if not already inside one, so consumers don't need to know about the layout dependency.

### Streaming Contract

**Token-by-token rendering**:
1. Tokens arrive via SSE `data:` events or WebSocket messages.
2. Each token is appended to `streamBuffer` and the message display re-renders.
3. Markdown parsing runs incrementally: complete blocks (paragraphs, code fences, lists) are parsed and rendered; incomplete blocks show as plain text with cursor.
4. Code blocks are syntax-highlighted as they complete (language detection from fence info string).
5. Re-render budget per token: < 5ms. If a burst of tokens arrives (> 10 in < 16ms), they are batched into a single render.
6. Cursor animation: a blinking `|` character at the end of the stream buffer, animated at 530ms on/530ms off.

**Markdown rendering**:
- Headings: h1-h4 with appropriate typography tokens.
- Bold, italic, strikethrough, inline code.
- Code blocks with syntax highlighting (language auto-detection or fence-specified).
- Ordered and unordered lists (nested up to 3 levels).
- Tables (rendered as compact DataTable).
- Links (open in new tab on web, in-app browser on mobile).
- Images (rendered inline with lazy loading).
- Block quotes.
- Horizontal rules.
- LaTeX math expressions (inline `$...$` and block `$$...$$`).

### Tool Call Visualization (StreamOfThought)

Tool calls are displayed as a step list within the assistant's message:

```
  Searching knowledge base...        [done]     (1.2s)
  Analyzing 3 relevant documents     [running]  (...)
  Generating response                [queued]
```

Each step has:
- **Name**: Tool or action description.
- **Status**: `queued` (gray dot), `running` (blue spinner), `done` (green checkmark), `error` (red X).
- **Duration**: Elapsed time shown for `running` (live counter) and `done` (final time).
- **Expandable**: Clicking a step shows its parameters (input) and result (output) in a collapsible panel.

The StreamOfThought block appears inline within the assistant message, between the tool call and the final response text.

### Action Plan

When the assistant proposes a multi-step plan, it is rendered as a numbered list with per-step controls:

```
Plan: Set up user authentication

  1. Create User model with email/password fields     [Approve] [Modify] [Reject]
  2. Add login endpoint with JWT token generation      [Approve] [Modify] [Reject]
  3. Add registration endpoint with email validation   [Approve] [Modify] [Reject]
  4. Add password reset flow with email verification   [Approve] [Modify] [Reject]

  [Approve All]  [Reject All]
```

- **Approve**: Step is accepted. Button changes to green checkmark.
- **Modify**: Opens an inline text editor to modify the step description. On save, the modified step is sent back to the assistant.
- **Reject**: Step is rejected with optional reason input.
- **Approve All / Reject All**: Batch operations on all pending steps.
- Steps already approved/rejected show their status and cannot be changed (unless the assistant re-proposes).

### Citation System

**Inline citations**: Rendered as superscript numbers within the assistant message text. Example: "The revenue grew by 15%[1] compared to last quarter[2]."

**Citation panel**: A collapsible side panel (right side on desktop, bottom sheet on mobile) showing citation details:
- Source title (clickable link to original).
- Relevant excerpt (highlighted text from the source).
- Confidence score (displayed as percentage badge: green >= 80%, yellow >= 50%, red < 50%).
- Page number (if applicable).

**Interaction**:
- Clicking a citation number opens the panel and highlights the corresponding citation card.
- Clicking a citation card in the panel scrolls the message to the inline reference.
- Multiple citations can be highlighted simultaneously.

### Conversation Management

**Thread list** (sidebar):
- Grouped by date: "Today", "Yesterday", "Last 7 days", "Last 30 days", "Older".
- Each item shows: conversation title (auto-generated from first user message or explicit title), last message preview (truncated to 80 characters), timestamp.
- New conversation button at the top.
- Search input above the list (filters by title and message content).
- Swipe to delete on mobile. Right-click context menu on desktop with: Rename, Pin, Delete.

**Branching** (when enabled):
- User can click "Edit" on any of their previous messages.
- The message becomes editable inline.
- On submit, a new branch is created from that point. The original branch is preserved.
- A branch indicator shows "Branch 1", "Branch 2" etc. with a switcher to navigate between branches.

### Input Configuration

**Input area components**:
1. **Text input**: Multi-line textarea with auto-grow (1 line to 6 lines max). Markdown formatting supported.
2. **Attachment button**: Opens file picker. Selected files shown as removable chips below the input.
3. **Source selector**: Dropdown to filter which data sources the assistant searches. Only shown when `input.sources` is configured.
4. **Send button**: Primary icon button (arrow-up icon). Disabled when input is empty and no attachments.

**Keyboard shortcuts**:
- `Enter`: Send message.
- `Shift+Enter`: New line in input.
- `Escape`: Clear input (if not empty) or close citation panel (if open).
- `Ctrl/Cmd+K`: Open conversation search.
- `Ctrl/Cmd+N`: New conversation.
- `Up Arrow` (in empty input): Edit last user message (if branching enabled).

**Suggestion chips**:
- Displayed below the input area when the conversation is empty or after an assistant response.
- Horizontal scrollable row of chip buttons.
- Clicking a chip populates the input and optionally auto-sends.
- Chips are either static (configured in `features.templates`) or dynamic (returned by the assistant in the response metadata).

### Performance Contract

- **Time to first token display**: < 100ms from when the first SSE/WebSocket token arrives.
- **Token append render**: < 5ms per token render cycle. Batch if tokens arrive faster than 16ms.
- **Message list scroll**: 60 fps scroll performance with up to 1000 messages loaded. Messages beyond the viewport are virtualized.
- **Conversation switch**: < 200ms to render a cached conversation. < 500ms for a conversation requiring a network fetch.
- **Search**: < 100ms for client-side search across 1000 messages. Server-side search for larger histories.
- **Citation panel**: Opens in < 100ms (slide animation).
- **Markdown rendering**: Complete message markdown rendering MUST finish within 50ms for messages up to 5000 characters.

### Accessibility Contract

- **Landmark**: Chat area uses `role="log"` with `aria-live="polite"` for new messages. `aria-label="Conversation with AI assistant"`.
- **Messages**: Each message has `role="article"` with `aria-label="{sender} said: {first 100 chars}"`.
- **Streaming**: During streaming, the in-progress message has `aria-busy="true"`. On completion, the final message is announced via `aria-live`.
- **Input**: `aria-label="Message input"`. Character count announced when approaching `maxLength` (at 80% and 95%).
- **Send**: Send button has `aria-label="Send message"`. Disabled state communicated via `aria-disabled`.
- **Citations**: Citation numbers are buttons with `aria-label="Citation {n}: {source title}"`. Citation panel has `role="complementary"` with `aria-label="Citations"`.
- **Tool calls**: StreamOfThought has `role="status"`. Each step announces its status change.
- **Action plan**: Plan has `role="list"`. Each step's buttons have `aria-label="Approve step {n}: {description}"` etc.
- **Conversation list**: `role="navigation"` with `aria-label="Conversations"`. Active conversation has `aria-current="true"`.
- **Keyboard**: All interactive elements reachable via Tab. Escape closes panels and popovers. Focus trapped in mobile drawer when open.

### Responsive Contract

| Breakpoint | Behavior |
|------------|----------|
| `mobile` (0-767px) | Conversation list hidden (accessible via hamburger). Chat takes full width. Citation panel as bottom sheet (half screen). Input fixed to bottom. StreamOfThought collapsed by default (tap to expand). Action plan buttons stack vertically. |
| `tablet` (768-1023px) | Conversation list as collapsible drawer (icon-only rail when collapsed). Chat takes remaining width. Citation panel as slide-over from right (40% width). |
| `desktop` (1024-1439px) | Conversation list visible (260px). Chat fills middle. Citation panel as inline side panel (280px), togglable (hidden by default, shown on citation click). |
| `wide` (1440px+) | Conversation list visible (320px). Chat fills middle. Citation panel as inline side panel (380px). Three-column layout: conversations | chat | citations. |

### Web Implementation Notes

- Streaming via `EventSource` (SSE) or native `WebSocket`.
- Markdown rendering via `react-markdown` with `remark-gfm` and `rehype-highlight` plugins.
- LaTeX via `rehype-katex`.
- Virtual message list via `@tanstack/virtual` with reverse scroll (newest messages at bottom, scroll up for history).
- Citation panel uses `Layer` primitive with `tier: "page"` (inline, not overlay) on desktop; `tier: "modal"` (bottom sheet) on mobile.
- Conversation list state persisted to `localStorage`.

### Flutter Implementation Notes

- Streaming via `dart:io` `WebSocket` or `http` package for SSE parsing.
- Markdown rendering via `flutter_markdown` with custom syntax extensions.
- LaTeX via `flutter_math_fork`.
- Message list via `ListView.builder` with `reverse: true` for bottom-anchored scrolling.
- Citation panel via `DraggableScrollableSheet` on mobile; `Row` layout with constrained width on desktop.
- Conversation list via `NavigationDrawer` on mobile; persistent `Column` on desktop.

---
