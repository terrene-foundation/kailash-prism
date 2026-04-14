# Red Team: Arbor Advisory Pilot Migration

**Date:** 2026-04-14
**Scope:** Wiring arbor's `/advisory` page to use Prism's `ConversationTemplate` in wired mode

## Summary

Arbor's advisory page (133 LOC bespoke → 55 LOC with Prism) successfully compiled and rendered via `/advisory-prism` side-by-side route. The adapter pattern works, but surfaced several gaps in Prism's type system and extensibility.

## Findings

### HIGH — Must fix before wider adoption

| # | Finding | Prism component | Recommendation |
|---|---------|----------------|----------------|
| H1 | `ConversationSummary` and `ChatMessage` have no generic metadata field. Arbor needs `riskTier`, `confidenceScore`, `provisionsCited` per message and `riskTier` per conversation. Currently requires interface extension + type assertion. | `types.ts` | Add `meta?: Record<string, unknown>` to both types |
| H2 | New conversation ID propagation is racy — `sendMessage` with `conversationId: null` creates a new conversation but the ID only arrives in the `complete` event. `useChatState` calls `refreshConversations` but doesn't update `activeConversationId` to the new ID. | `use-chat-state.ts` | Accept new conversation ID from `onComplete` data and set it as active |
| H3 | No `renderMessageActions` slot — arbor shows per-message feedback (thumbs up/down), risk tier badge, and escalation button per assistant message. ChatEngine has no extension point for this. | `chat-engine.tsx` | Add `renderMessageActions?: (message: ChatMessage) => ReactNode` |

### MEDIUM — Should fix for adoption quality

| # | Finding | Prism component | Recommendation |
|---|---------|----------------|----------------|
| M1 | Turbopack can't resolve `file:` symlinked packages — forced `npm pack` tarball workaround | DX / docs | Document in adoption guide; resolved when published to npm |
| M2 | No `onSend` interception in wired mode that can modify the request (e.g., add `company_id`) | `conversation-template.tsx` | Expose `transformRequest` or `adapterConfig` prop |
| M3 | `LayoutProvider` required but not obvious — ConversationTemplate crashes without it | `conversation-template.tsx` | Auto-wrap with LayoutProvider internally if not present |

### LOW — Nice to have

| # | Finding | Recommendation |
|---|---------|----------------|
| L1 | No voice input in ChatInput | Add optional `enableVoice` flag |
| L2 | CSS token conflicts with host app's Tailwind | Document CSS isolation strategy |
| L3 | No loading skeleton for conversation list | Add `isLoading` prop to ConversationSidebar |

## Arbor Adapter Pattern Assessment

The `ChatAdapter` interface proved well-designed for the adapter pattern:
- 5 methods map cleanly to arbor's API
- `ChatStreamHandle` callback pattern maps to arbor's SSE events
- `number` → `string` ID conversion is trivial

**What works well:**
- Wired mode ConversationTemplate reduced arbor's advisory page from 133 LOC + 2 bespoke components to 55 LOC + 1 adapter file
- `renderMeta` slot for risk tier badges works as intended
- Sidebar date grouping, search, rename, delete all inherited from Prism

**What's missing for production parity:**
- Per-message metadata (risk tier, confidence, citations)
- Per-message action buttons (feedback, escalation)
- Loading states for conversations list and messages
