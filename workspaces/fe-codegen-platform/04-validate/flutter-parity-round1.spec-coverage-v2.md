# Flutter Parity Red Team — Round 1 Spec Coverage (v2)

**Scope**: commit `e1b87cf` on `feat/phase1-flutter-parity`.
**Files under audit**:
- `flutter/lib/engines/k_chat.dart` (KChatEngine + KStreamOfThought + KActionPlan + KSuggestionChips + KChatInput + message bubble)
- `flutter/lib/atoms/{k_button,k_badge,k_avatar,k_spinner}.dart`
- `flutter/lib/templates/k_templates.dart` (11 templates)

**Promise sources**:
- `docs/specs/05-engine-specifications.md` § 5.6 "AI Chat Engine"
- `docs/specs/06-page-templates.md`
- Web reference: `web/src/engines/ai-chat/*.tsx`, `web/src/atoms/*.tsx`, `web/src/templates/*.tsx`

Every assertion below is re-derived from the web reference + spec text and verified against the Flutter source by direct file:line inspection. No prior round outputs consulted.

---

## Section A — KChatEngine config parity with `ChatEngineConfig` (web/src/engines/ai-chat/types.ts:107-154)

| # | Assertion | Method | Expected | Actual | Status |
|---|-----------|--------|----------|--------|--------|
| A.1 | 7 message types exposed (user / assistant / assistant-streaming / system / tool-call / tool-result / error) | enum scan `KMessageType` k_chat.dart:23-31 | 7 values | 7 values (user, assistant, assistantStreaming, system, toolCall, toolResult, error) | PASS |
| A.2 | `ChatMessage` fields: id, type, content, timestamp, sender, citations, toolCall, toolResult, parentId, branchIndex | field scan `class KChatMessage` k_chat.dart:79-103 | all 10 fields | all 10 fields present | PASS |
| A.3 | `ChatEngineConfig.onSend` callback exposed | grep `onSend` k_chat.dart:209 | 1 field | `void Function(KChatSendEvent)? onSend` | PASS |
| A.4 | `ChatEngineConfig.onActionPlanResponse` exposed | k_chat.dart:210 | 1 field | `void Function(KActionPlanResponse)? onActionPlanResponse` | PASS |
| A.5 | `ChatEngineConfig.onCitationClick` exposed | k_chat.dart:211 | 1 field | `void Function(KCitation)? onCitationClick` | PASS |
| A.6 | `ChatEngineConfig.onSuggestionClick` exposed | k_chat.dart:212 | 1 field | `void Function(KSuggestionChip)? onSuggestionClick` | PASS |
| A.7 | `ChatEngineConfig.onRetry` exposed | k_chat.dart:213 | 1 field | `void Function(String messageId)? onRetry` | PASS |
| A.8 | `features.citations` toggle | k_chat.dart:160,166 | bool default true | `bool citations = true` | PASS |
| A.9 | `features.toolCalls` toggle | k_chat.dart:161,167 | bool default true | `bool toolCalls = true` | PASS |
| A.10 | `features.actionPlans` toggle | k_chat.dart:162,168 | bool default true | `bool actionPlans = true` | PASS |
| A.11 | `features.suggestions` toggle | k_chat.dart:163,169 | bool default true | `bool suggestions = true` | PASS |
| A.12 | `input.placeholder` honored | k_chat.dart:174 + 325 + 1577 | passed through to TextField hintText | `hintText: widget.placeholder` | PASS |
| A.13 | `input.maxLength` honored | k_chat.dart:175 + 328 + 1575 | passed to TextField.maxLength | `maxLength: widget.maxLength` | PASS (actually stricter than web — see F.1) |
| A.14 | `input.disabled` honored | k_chat.dart:176 + 326 + 1572 | enabled=!disabled | `enabled: !widget.disabled` | PASS |
| A.15 | `input.allowAttachments` honored | k_chat.dart:177 + 327 + 1550 | attach button renders when true | conditional attach button at 1550 | PARTIAL — see F.2 |
| A.16 | `input.sources` (SourceOption picker) | grep `sources` k_chat.dart | present | only string "sources" in citation label (k_chat.dart:757) | **FAIL — MEDIUM** |
| A.17 | `avatars.user` / `avatars.assistant` | k_chat.dart:207-208 | both exposed | exposed as `userAvatar` / `assistantAvatar` (flat, not nested — API shape divergence) | PASS (semantic) / LOW (API shape) |
| A.18 | `ariaLabel` prop | k_chat.dart:214 + 287 | exposed and applied | `label: widget.ariaLabel ?? 'Chat conversation'` | PASS |
| A.19 | Auto-scroll on new messages / streamBuffer | k_chat.dart:245-255 | scroll jump on change | `WidgetsBinding.addPostFrameCallback(..jumpTo(maxScrollExtent))` | PASS |
| A.20 | Cmd/Ctrl+Enter sends | k_chat.dart:1529-1537 | key handler on meta/ctrl+enter | `HardwareKeyboard.isMetaPressed \|\| isControlPressed` | PASS |
| A.21 | Empty-state copy "Start a conversation" + sub copy | k_chat.dart:428, 439 | text present | literal text present | PASS |

---

## Section B — Message bubble handles all 7 types

| # | Assertion | Method | Expected | Actual | Status |
|---|-----------|--------|----------|--------|--------|
| B.1 | `user` → bubble, right-aligned, primary color | k_chat.dart:562-628 | user renders on right w/ interactivePrimary | `isUser ? interactivePrimary : surfaceElevated`; RTL row | PASS |
| B.2 | `assistant` → bubble, left-aligned, elevated surface | same block | assistant renders on left | `crossAxis = isUser ? end : start` | PASS |
| B.3 | `assistant-streaming` → bubble with blinking cursor | k_chat.dart:361-375 + 632-702 | streaming flag renders cursor | `_StreamingText` with `FadeTransition` + 1060ms controller | PASS |
| B.4 | `system` → centered, muted | k_chat.dart:494-506 | centered Text with textDisabled color | Center + `textDisabled` | PASS |
| B.5 | `tool-call` → inline card rendered via `_ToolCallCard` | k_chat.dart:510-512 + 869-973 | branch returns card | `if (type == toolCall) return _ToolCallCard(...)` | PASS |
| B.6 | `tool-result` → inline card rendered via `_ToolResultCard` | k_chat.dart:513-515 + 975-1042 | branch returns card | `if (type == toolResult) return _ToolResultCard(...)` | PASS |
| B.7 | `error` → bordered alert with Retry button | k_chat.dart:518-559 | red border + retry wired | OutlinedButton(onPressed: onRetry!(msg.id)) | PASS |
| B.8 | Tool-call parameters display format matches web | k_chat.dart:964 vs web chat-message.tsx:245 | `JSON.stringify(params, null, 2)` | `entries.map((e) => '${k}: ${v}').join('\n')` | **FAIL — LOW** (display divergence) |
| B.9 | Tool duration field name matches web `duration` | k_chat.dart:57 (`durationMs`) vs types.ts:35 (`duration`) | `duration` | `durationMs` | **FAIL — MEDIUM** (API shape divergence — downstream Kaizen payload mapping will break) |
| B.10 | Tool-call status icon set matches web (✓/⟳/✗/○) | k_chat.dart:882-892 | 4 icons | ✓ ⟳ ✗ ○ | PASS |

---

## Section C — Citations, StreamOfThought, SuggestionChips, ActionPlan

| # | Assertion | Method | Expected | Actual | Status |
|---|-----------|--------|----------|--------|--------|
| C.1 | Citation toggle pluralization: "source" / "sources" | grep k_chat.dart:767 vs web chat-message.tsx:122 | `${n} source${n==1?'':'s'}` | `'${len} source${len == 1 ? "" : "s"}'` | PASS |
| C.2 | Citation confidence badge color threshold 0.8 | k_chat.dart:837 | `> 0.8` | `cit.confidence! > 0.8` | PASS |
| C.3 | Citation click wired through `features.citations` gate | k_chat.dart:357, 374 | onCitationClick only when citations feature enabled | `widget.features.citations ? widget.onCitationClick : null` | PASS |
| C.4 | `KStreamOfThought` renders all steps with status markers | k_chat.dart:1048-1147 | for each step render icon + name + duration | present | PASS |
| C.5 | `KStreamOfThought` hides itself when steps empty | k_chat.dart:1087 | `if (steps.isEmpty) return SizedBox.shrink()` | present | PASS |
| C.6 | `KSuggestionChip` exposes label/value/icon | k_chat.dart:151-157 | 3 fields | label, value, icon? | PASS |
| C.7 | Suggestion chips row appears in empty state AND between messages/input (non-streaming) | k_chat.dart:298-315 | both branches | `_EmptyState` renders + `_KSuggestionChipsRow` below list when `!isEmpty && !isStreaming` | PASS |
| C.8 | Default tap behavior: populate input with `value` when no onSuggestionClick | k_chat.dart:273-280 | fallback sets controller.text | `_inputController.text = chip.value` | PASS |
| C.9 | `KActionPlan` header shows "N/M reviewed" | k_chat.dart:1232 | literal match | `'Action Plan ($resolved/${widget.steps.length} reviewed)'` | PASS |
| C.10 | `KActionPlan` "All steps reviewed" confirmation when complete | k_chat.dart:1246 | present | literal text at line 1246 | PASS |
| C.11 | Action plan modification editor: Enter submits | k_chat.dart:1345 | `onSubmitted` → `_submitModification` | `onSubmitted: (_) => _submitModification(stepIndex)` | PASS |
| C.12 | Action plan modification editor: Escape cancels | grep `Escape\|escape\|cancel` around 1329-1363 | KeyboardListener handling escape | **no escape handler** — web action-plan.tsx:144 has `if (e.key === 'Escape') setEditingStep(null)` | **FAIL — MEDIUM** |
| C.13 | Approve/Modify/Reject buttons per pending step | k_chat.dart:1365-1394 | 3 buttons visible when pending | present | PASS |
| C.14 | onResponse fires with `{stepIndex, action, modification?}` | k_chat.dart:1183-1189, 1373, 1387 | matches web shape | `KActionPlanResponse(stepIndex, action, modification)` | PASS |

---

## Section D — Page templates responsiveness & parity with web

| # | Assertion | Method | Expected | Actual | Status |
|---|-----------|--------|----------|--------|--------|
| D.1 | `KDashboardTemplate` stats grid 1/2/4 (mobile/tablet/desktop) | k_templates.dart:127 vs dashboard-template.tsx:41 | `mobile: 1, tablet: 2, desktop: 4` | `KResponsiveValue<int>(mobile: 1, tablet: 2, desktop: 4)` | PASS |
| D.2 | `KDashboardTemplate` primary/secondary: stack on mobile+tablet, 2:1 split on desktop | k_templates.dart:133-149 vs dashboard-template.tsx:46-57 | matches | `if (isMobile \|\| isTablet) Stack else Split(2,1)` | PASS |
| D.3 | `KDashboardTemplate` detail grid 1/2/3 | k_templates.dart:152 vs dashboard-template.tsx:60 | matches | matches | PASS |
| D.4 | `KListTemplate` zones: header / filterBar / content / footer | k_templates.dart:186-199 | all four | present | PASS |
| D.5 | `KDetailTemplate` stacks sidebar on mobile+tablet, 2:1 on desktop | k_templates.dart:229, 236-251 vs detail-template.tsx:35, 42 | matches | `stackSidebar = mobile \|\| tablet` → Split(2,1) else Stack | PASS |
| D.6 | `KDetailTemplate` renders `summary` + `related` optional sections | k_templates.dart:235, 252 | both | present | PASS |
| D.7 | `KFormTemplate` maxWidth default 720 | k_templates.dart:279 vs form-template.tsx:28 | 720 | `this.maxWidth = 720` | PASS |
| D.8 | `KFormTemplate` stacks sidebar on mobile+tablet, 2:1 on desktop | k_templates.dart:286, 297-312 | matches | identical logic | PASS |
| D.9 | `KSettingsTemplate` 1:3 nav/content split on non-mobile | k_templates.dart:344, 350-366 vs settings-template.tsx:29, 35 | 1:3 | `KSplit(primaryFlex:1, secondaryFlex:3)` | PASS |
| D.10 | `KSettingsTemplate` stacks on mobile only (not tablet) | k_templates.dart:344 | `isMobile` only | `final isMobile = breakpoint == mobile` | PASS |
| D.11 | `KAuthTemplate` default maxWidth 420 | k_templates.dart:386 vs auth-template.tsx:48 | 420 | `this.maxWidth = 420` | PASS |
| D.12 | `KAuthTemplate` brand panel 40% left, navy bg | k_templates.dart:427-438 vs auth-template.tsx:27-35 | 40% / interactivePrimary | `Expanded(flex: 2)` form `flex: 3` = 40/60 split + interactivePrimary bg | PASS |
| D.13 | `KAuthTemplate` hides brand panel on mobile | k_templates.dart:396 vs auth-template.tsx | web ALWAYS renders brand panel (no breakpoint check) | `showBrand = brandPanel != null && breakpoint != mobile` | **DIVERGENCE — LOW** (Flutter hides; web always shows. Question claims web hides on mobile — web source does not confirm this. Flutter's behavior is arguably more correct but still a parity gap.) |
| D.14 | `KConversationTemplate` hides detail panel on BOTH mobile AND tablet | k_templates.dart:472-474 vs conversation-template.tsx:56-57 | `mobile \|\| tablet` | `hideDetail = breakpoint == mobile \|\| breakpoint == tablet` | PASS |
| D.15 | `KConversationTemplate` hides list on mobile only | k_templates.dart:472 vs conversation-template.tsx:56 | `isMobile` | `hideList = breakpoint == mobile` | PASS |
| D.16 | `KConversationTemplate` listWidth 280, detailWidth 320 defaults | k_templates.dart:464-465 | 280 / 320 | `listWidth = 280, detailWidth = 320` | PASS |
| D.17 | `KSplitTemplate` stacks on mobile, split otherwise | k_templates.dart:533, 538-548 | matches | present | PASS |
| D.18 | `KWizardTemplate` centered, maxWidth 640 default | k_templates.dart:572, 581-586 | 640, centered | `this.maxWidth = 640`, `Center(ConstrainedBox(maxWidth))` | PASS |
| D.19 | `KKanbanColumn` shape: `{id, title, count?, children}` | k_templates.dart:596-608 vs kanban-template.tsx:13-18 | `children: ReactNode` | Flutter uses `child: Widget` (singular) not `children` | **FAIL — LOW** (API naming divergence; doc/usage mismatch across engines) |
| D.20 | `KKanbanTemplate` column default width 300 | k_templates.dart:623 vs kanban-template.tsx:25 | 300 | `this.columnWidth = 300` | PASS |
| D.21 | `KKanbanTemplate` horizontal scroll with count badge | k_templates.dart:637-697 | scrollable list + count | `ListView.separated(scrollDirection: Axis.horizontal)` + count badge | PASS |
| D.22 | `KCalendarTemplate` stacks event detail on mobile+tablet, 3:1 on desktop | k_templates.dart:732-764 vs calendar-template.tsx:31-55 | matches | `stackDetail = mobile \|\| tablet` → `Split(3,1)` else stack | PASS |
| D.23 | `KCalendarTemplate` merges viewControls + headerActions into header | k_templates.dart:735-747 | both rendered in header actions | `mergedActions = [viewControls..., headerActions...]` | PASS |
| D.24 | Every template has `KTemplateHeader` with title/subtitle/actions | k_templates.dart:25-88 + every render method | header present in 10/11 templates (Conversation has no header) | 10 templates use header; Conversation has no header (web matches — no TemplateHeader in web either) | PASS |

---

## Section E — Atoms (button/badge/avatar/spinner) parity

| # | Assertion | Method | Expected | Actual | Status |
|---|-----------|--------|----------|--------|--------|
| E.1 | `KButton` variants: primary/secondary/tertiary/destructive/ghost | k_button.dart:7 vs button.tsx:10 | 5 | 5 | PASS |
| E.2 | `KButton` sizes: sm/md/lg with heights 32/40/44 | k_button.dart:33-42 vs button.tsx:22-26 | 32/40/44 | 32/40/44 | PASS |
| E.3 | `KButton` loading prop + spinner inline | k_button.dart:18, 98-106 | spinner replaces iconLeft when loading | `if (loading) CircularProgressIndicator else if (iconLeft)` | PASS |
| E.4 | `KButton` `aria-busy` on loading | grep `aria-busy\|busy` k_button.dart vs button.tsx:94 | `Semantics(busy: true)` | **no busy attribute in Semantics** (only `button:true, enabled`) | **FAIL — LOW** (a11y divergence) |
| E.5 | `KButton` iconLeft + iconRight props | k_button.dart:17-18 | both | both | PASS |
| E.6 | `KBadge` variants default/primary/success/warning/error/info | k_badge.dart:7 vs badge.tsx:10 | 6 | 6 | PASS |
| E.7 | `KBadge` sizes sm/md heights 18/22 | k_badge.dart:57 vs badge.tsx:39-40 | 18/22 | 18/22 | PASS |
| E.8 | `KBadge` dot mode | k_badge.dart:46-54 vs badge.tsx:50 | dot supported | present | PASS |
| E.9 | `KBadge` dot a11y | badge.tsx:51 `aria-hidden="true"` | decorative | Flutter uses `Semantics(label: 'Status indicator')` (not hidden) | **FAIL — LOW** (a11y divergence — web treats dot as decorative, Flutter announces it) |
| E.10 | `KAvatar` sizes xs/sm/md/lg/xl → 24/32/40/48/64 | k_avatar.dart:16-29 vs avatar.tsx:19 | 24/32/40/48/64 | same | PASS |
| E.11 | `KAvatar` initials fallback | k_avatar.dart:31-37 vs avatar.tsx:21-26 | initials from first+last word | same algorithm | PASS |
| E.12 | `KAvatar` hash-based background color | k_avatar.dart:39-46 vs avatar.tsx:28-35 | same hash algo | bit-shift hash + HSL(h, 45%, 55%) — identical | PASS |
| E.13 | `KAvatar` image fallback to initials on load error | k_avatar.dart:60-66 | errorBuilder → initials | `errorBuilder: (_, __, ___) => _buildInitials(px)` | PASS |
| E.14 | `KSpinner` sizes sm/md/lg → 16/24/36 | k_spinner.dart:14-23 vs spinner.tsx:18 | 16/24/36 | same | PASS |
| E.15 | `KSpinner` role/status + label live region | k_spinner.dart:30-32 vs spinner.tsx:36-37 | `role="status"` + label | `Semantics(label, liveRegion: true)` | PASS |

---

## Section F — Fake implementations / stubs / security

| # | Assertion | Method | Expected | Actual | Status |
|---|-----------|--------|----------|--------|--------|
| F.1 | Attachment button invokes a real file picker | k_chat.dart:321-324 + 1556-1562 | file-system picker returning real `File[]` | `onAttach!(const [])` — **hardcoded empty list** — no picker | **FAIL — HIGH (stub / fake implementation — zero-tolerance Rule 2)** |
| F.2 | Attachment button passes selected files to onSend | same lines | non-empty when user picks files | always empty list | **FAIL — HIGH** — see F.1 (same root) |
| F.3 | Error-state hardcoded color `Color(0xFFFEF2F2)` | k_chat.dart:524 | comes from PrismColors tokens | hardcoded hex | **FAIL — MEDIUM** (token-driven design rule violation, CLAUDE.md directive 2) |
| F.4 | Action plan bg colors hardcoded hex `0xFFF0FDF4`, `0xFFFEF2F2`, `0xFFFFFBEB` | k_chat.dart:1198-1202, 1307, 837 | tokens | hardcoded | **FAIL — MEDIUM** (token-driven design rule violation) |
| F.5 | Warning badge bg `Color(0xFFFEF3C7)` | k_badge.dart:34 | token | hardcoded | **FAIL — MEDIUM** (token rule) |
| F.6 | Info badge bg `Color(0xFFEFF6FF)` | k_badge.dart:38 | token | hardcoded | **FAIL — MEDIUM** (token rule) |
| F.7 | Auth template shadow hardcoded `Color(0x1A000000)` | k_templates.dart:407 | shadow from tokens | hardcoded | **FAIL — LOW** (token rule) |

---

## Section G — Test coverage verification

Method: `grep -rln "KChatEngine\|KButton\|KBadge\|KAvatar\|KSpinner\|K*Template" flutter/test/`

| # | Module | Test file | Coverage level | Status |
|---|--------|-----------|----------------|--------|
| G.1 | `k_chat.dart` KChatEngine | `flutter/test/chat_test.dart` (16 testWidgets) | Covers: empty state, suggestions, user/asst/system/error/streaming messages, citations collapse/expand, input send/disabled, stream-of-thought, action-plan approve/all-resolved | PASS (partial) |
| G.2 | `k_chat.dart` tool-call / tool-result message rendering | grep `toolCall\|toolResult` chat_test.dart | ≥1 test | 0 tests — **HIGH** |
| G.3 | `k_chat.dart` onCitationClick callback fires | grep `onCitationClick` chat_test.dart | ≥1 test | 0 tests — MEDIUM |
| G.4 | `k_chat.dart` onSuggestionClick callback fires | grep `onSuggestionClick` chat_test.dart | ≥1 test | 0 tests — MEDIUM |
| G.5 | `k_chat.dart` Cmd/Ctrl+Enter send | grep `ctrl\|meta\|HardwareKeyboard` chat_test.dart | ≥1 test | 0 tests — MEDIUM |
| G.6 | `k_chat.dart` maxLength input honored | grep `maxLength` chat_test.dart | ≥1 test | 0 tests — LOW |
| G.7 | `k_chat.dart` allowAttachments branch | grep `allowAttachments\|attach` chat_test.dart | ≥1 test | 0 tests — HIGH (given stub in F.1) |
| G.8 | `k_chat.dart` action-plan modify path (editor + Enter submit) | grep `modify\|modification` chat_test.dart | ≥1 test | 0 tests — MEDIUM |
| G.9 | `k_chat.dart` action-plan reject path | grep `reject` chat_test.dart | ≥1 test | 0 tests — MEDIUM |
| G.10 | `k_button.dart` variants render | atoms_test.dart:66 | 1 test | PASS |
| G.11 | `k_button.dart` loading + disabled | atoms_test.dart:42,53 | 2 tests | PASS |
| G.12 | `k_badge.dart` all variants + dot | atoms_test.dart:94-113 | covered | PASS |
| G.13 | `k_avatar.dart` initials + sizes | atoms_test.dart:142,149 | covered | PASS |
| G.14 | `k_spinner.dart` size rendering | atoms_test.dart:160,165 | covered | PASS |
| G.15 | `k_templates.dart` all 11 templates | templates_test.dart (17 testWidgets covering every template) | all covered | PASS |
| G.16 | `k_templates.dart` tablet breakpoint tests | grep `tablet\|Tablet\|1024\|800` templates_test.dart | ≥1 test for conversation hideDetail, dashboard split behavior | 0 tests (only mobile + desktop sizes used) — **MEDIUM** |
| G.17 | `k_templates.dart` KAuthTemplate brand hidden on mobile | templates_test.dart:147 | ≥1 test | PASS (desktop+mobile both tested) |

---

## Section H — Missing config surface (web-only features)

| # | Web feature | Spec/file | Flutter coverage | Severity |
|---|-------------|-----------|------------------|----------|
| H.1 | `SourceOption[]` (input.sources picker) | types.ts:88-93, 126 | Not exposed | MEDIUM — documented chat feature missing |
| H.2 | `ConversationSummary` type (for conversation-list sidebar) | types.ts:97-103 | Not defined | LOW (consumer-land type) |
| H.3 | `avatars` as nested object `{ user, assistant }` | types.ts:131-134 | Flat `userAvatar`/`assistantAvatar` props | LOW (API shape) |
| H.4 | `onSend` third arg `source` for SourceOption selection | types.ts:145 | Not exposed | MEDIUM (blocks sources UX) |

---

## Classification Summary

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 0 | — |
| HIGH | 3 | F.1/F.2 (attachment picker stub → fake impl, zero-tolerance Rule 2), G.2 (0 tests for tool-call/tool-result rendering) |
| MEDIUM | 10 | A.16/H.1 (sources picker missing), B.8 (tool params display format), B.9 (durationMs vs duration field name), C.12 (Escape-cancel missing in action-plan editor), F.3/F.4/F.5/F.6 (4× token-rule violations, hardcoded hex), G.3-G.5/G.8-G.9 (callback + interaction tests missing), G.16 (no tablet breakpoint tests), H.4 (no onSend.source) |
| LOW | 7 | A.17 (avatars flat vs nested), D.13 (auth hide-on-mobile divergence), D.19 (KanbanColumn `child` vs `children`), E.4 (aria-busy missing), E.9 (dot a11y divergence), F.7 (auth shadow hardcoded), G.6 (maxLength test missing), H.2 (ConversationSummary type), H.3 (avatars API shape) |

---

## Verification commands (re-runnable next round)

```bash
# A.1 — message types
grep -c -E "user|assistant|assistantStreaming|system|toolCall|toolResult|error" flutter/lib/engines/k_chat.dart | head

# B.8 — tool params display
grep -n "JSON.stringify\|parameters.entries.map" flutter/lib/engines/k_chat.dart web/src/engines/ai-chat/chat-message.tsx

# C.12 — escape handler
grep -n "Escape\|escape\|LogicalKeyboardKey.escape" flutter/lib/engines/k_chat.dart

# F.1/F.2 — attachment stub
grep -n "onAttach\|attachments\|const \[\]" flutter/lib/engines/k_chat.dart

# F.3-F.7 — hardcoded hex
grep -n "Color(0xFF" flutter/lib/engines/k_chat.dart flutter/lib/atoms/k_badge.dart flutter/lib/templates/k_templates.dart

# G.2 — tool-call tests
grep -n "toolCall\|toolResult\|KMessageType.toolCall" flutter/test/chat_test.dart

# G.7 — attachment tests
grep -n "allowAttachments\|attach" flutter/test/chat_test.dart

# G.16 — tablet tests
grep -n "tablet\|Tablet\|800\|900\|1024" flutter/test/templates_test.dart

# H.1/H.4 — sources
grep -n "SourceOption\|input.sources\|onSend.*source" flutter/lib/engines/k_chat.dart
```

---

## Convergence status — NOT converged

HIGH findings (3) and MEDIUM findings (10) must be addressed before this parity PR merges. The attachment stub (F.1/F.2) is a zero-tolerance Rule 2 violation and alone blocks merge. The `durationMs` vs `duration` field name mismatch (B.9) will silently break Kaizen backend payload mapping once wired. Token-rule violations (F.3-F.7) violate CLAUDE.md Directive 2 "Token-Driven Design."
