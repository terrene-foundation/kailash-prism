# Flutter Parity Round 1 — Test Coverage Audit

**Commit:** `e1b87cf` on `feat/phase1-flutter-parity`
**Repo:** `/Users/esperie/repos/loom/kailash-prism`
**Date:** 2026-04-12
**Auditor mode:** Red team, Round 1 (audit mode — prior `.test-results` not trusted)

## Re-derived Test Results

Command: `flutter test` (run from `/Users/esperie/repos/loom/kailash-prism/flutter/`)

- **97 tests passed, 0 failed** (full Flutter suite at HEAD = `e1b87cf`).
- `flutter analyze`: `No issues found! (ran in 0.7s)`.

Distribution across the Phase 1 scope:

| File                         | Tests |
| ---------------------------- | ----- |
| `test/chat_test.dart`        | 16    |
| `test/atoms_test.dart`       | 19    |
| `test/templates_test.dart`   | 17    |
| **Scope total**              | **52** |

(Other 45 tests belong to `data_table_test`, `form_test`, `layout_test`, `navigation_test`, `theme_test` — out of scope.)

## Per-Module Coverage

All three test files import `package:kailash_prism/kailash_prism.dart`, which re-exports every module in scope via the barrel (`lib/kailash_prism.dart` lines 28–40). **No module has zero importing tests.** No HIGH "zero test" finding.

### `flutter/lib/engines/k_chat.dart` — KChatEngine

**Test file:** `test/chat_test.dart` (16 tests, 7 groups)

| Public symbol                       | Covered?   | Notes |
| ----------------------------------- | ---------- | ----- |
| `KChatEngine`                       | Yes        | 11 widget tests across empty state / messages / input / citations |
| `KStreamOfThought`                  | Yes        | 2 tests (empty steps, steps with status markers) |
| `KActionPlan`                       | Partial    | Approve action + header + all-resolved state covered. **Modify and reject actions NOT tested.** |
| `KActionPlanAction` enum            | Partial    | Only `approve` tested; `modify` and `reject` never constructed in tests |
| `KActionPlanStepStatus` enum        | Partial    | `pending` + `approved` covered; `modified` / `rejected` never exercised |
| `KCitation`                         | Yes        | Collapsed count + expansion tested |
| `KMessageType` enum                 | **Gap**    | `user`, `assistant`, `system`, `error` tested. `toolCall`, `toolResult`, `assistantStreaming` **never constructed in tests** |
| `KToolCallData`                     | **No**     | Never instantiated in any test |
| `KToolResultData`                   | **No**     | Never instantiated in any test |
| `KToolCallStep`                     | Yes        | Used by `KStreamOfThought` tests |
| `KToolCallStatus` enum              | Partial    | `queued`, `running`, `done` tested via stream-of-thought; `error` not |
| `KSuggestionChip`                   | Yes        | Rendered in empty-state test |
| `KChatFeatures`                     | **No**     | Class never constructed; default-on behaviour exercised indirectly but feature toggles (`citations:false`, `toolCalls:false`, etc.) never tested |
| `KChatInputConfig`                  | **No**     | Never constructed; placeholder / maxLength / disabled / allowAttachments never exercised |
| `KChatSendEvent`                    | Partial    | Observed via `onSend` callback content only; `attachments` field never set or read |
| `KMessageSender` enum               | Yes        | `user`, `assistant`, `system` all used |
| `onRetry` callback                  | Yes        | Error-retry test |
| `onCitationClick`                   | **No**     | Never passed in any test |
| `onSuggestionClick`                 | **No**     | Never passed in any test |
| `onActionPlanResponse` modify path  | **No**     | Only approve tested |

**Required checklist from the brief:**

| Required scenario                        | Covered? | Test name |
| ---------------------------------------- | -------- | ----- |
| Empty state                              | Yes      | "renders empty-state copy when no messages" |
| User/assistant bubbles                   | Yes      | "renders user and assistant messages" |
| System message                           | Yes      | "renders system message centered and muted" |
| Error retry                              | Yes      | "renders error message with retry button" |
| Streaming buffer                         | Yes      | "streaming buffer renders as in-progress bubble" |
| Citations expansion                      | Yes      | "tapping citations toggle expands the list" |
| Action plan approve                      | Yes      | "tapping approve fires onResponse with approve action" |
| Tool-call step list                      | Yes      | "renders all steps with status markers" |
| Input disabled during streaming          | Yes      | "input is disabled while streaming" |
| Send button disabled/enabled             | Yes      | "send button disabled when input is empty" + "send button fires onSend when input has text" |

All 10 required scenarios are covered. However, several auxiliary paths below are gaps.

### `flutter/lib/atoms/k_button.dart` — KButton

**Test file:** `test/atoms_test.dart`, group `KButton` (7 tests)

| Public symbol                       | Covered? |
| ----------------------------------- | -------- |
| `KButton`                           | Yes      |
| `KButtonVariant` enum (all 5)       | Yes (loop) |
| `KButtonSize` enum (all 3)          | Yes (loop) |

Scenario coverage: label, onPressed, disabled-blocks-tap, loading-shows-spinner, loading-blocks-tap, all-variants, all-sizes.

**Gaps:**

- **Icon slots not tested.** `k_button.dart` has leading/trailing icon props (per commit message "5 variants × 3 sizes, loading spinner, icon slots") — never exercised.
- **Variant/size loop tests are weak.** They only assert that the label still renders ("Go"), not that the variant produced a distinct visual (no color / padding / height assertion). A regression that makes all five variants render identically would still pass.

### `flutter/lib/atoms/k_badge.dart` — KBadge

**Test file:** `test/atoms_test.dart`, group `KBadge` (3 tests)

| Public symbol                       | Covered? |
| ----------------------------------- | -------- |
| `KBadge`                            | Yes      |
| `KBadgeVariant` (all 6)             | Yes (loop) |
| `KBadgeSize` (both)                 | **No**   |

**Gaps:**

- `KBadgeSize` enum has `sm` and `md` — **neither size is explicitly tested**, only the variant enum loop is run (implicit default size).
- Dot-mode test asserts `find.byType(KBadge)` which is a tautology (it was just pumped). Should assert on dot-only rendering (no text node present, or a specific size). **Weak test.**

### `flutter/lib/atoms/k_avatar.dart` — KAvatar

**Test file:** `test/atoms_test.dart`, group `KAvatar` (7 tests: 5 unit + 2 widget)

| Public symbol                       | Covered? |
| ----------------------------------- | -------- |
| `KAvatar`                           | Yes      |
| `KAvatar.initialsFor` (static)      | Yes (3 unit tests: single name, first+last, empty→"?") |
| `KAvatar.hashColor` (static)        | Yes (determinism + differentiation) |
| `KAvatarSize` (all 5)               | Yes (loop) |

**Gaps:**

- Image fallback (what happens when a `NetworkImage` 404s and the widget falls back to initials) not tested.
- `all sizes render` uses a fixed name "Alice" (always "A"), so the test cannot detect if a larger size accidentally truncates.

### `flutter/lib/atoms/k_spinner.dart` — KSpinner

**Test file:** `test/atoms_test.dart`, group `KSpinner` (2 tests)

| Public symbol                       | Covered? |
| ----------------------------------- | -------- |
| `KSpinner`                          | Yes      |
| `KSpinnerSize` (all 3)              | Yes (loop) |

**Gaps:**

- The a11y live-region label advertised in the commit message ("accessible live region label") is **not asserted** — no `Semantics` or `label:` assertion in either spinner test.

### `flutter/lib/templates/k_templates.dart` — 11 templates

**Test file:** `test/templates_test.dart` (17 tests, 13 groups)

| Template / symbol                   | Desktop | Mobile | Notes |
| ----------------------------------- | ------- | ------ | ----- |
| `KTemplateHeader`                   | Yes     | —      | 3 tests (title / title+subtitle / actions) |
| `KDashboardTemplate`                | Yes     | **No** | Stats + primary/secondary tests only at 1280×800 |
| `KListTemplate`                     | Yes     | **No** | Filter bar + content + footer, desktop only |
| `KDetailTemplate`                   | Yes     | **No** | Summary + content + sidebar + related, desktop only |
| `KFormTemplate`                     | Yes     | **No** | Content + sidebar, desktop only |
| `KSettingsTemplate`                 | Yes     | **No** | Nav + content, desktop only |
| `KAuthTemplate`                     | Yes     | **Yes** | Both breakpoints tested |
| `KConversationTemplate`             | Yes     | **Yes** | Both breakpoints tested |
| `KSplitTemplate`                    | Yes     | **No** | Desktop only |
| `KWizardTemplate`                   | Yes     | **No** | Desktop only |
| `KKanbanTemplate`                   | Yes     | **No** | Desktop only |
| `KCalendarTemplate`                 | Yes     | **No** | Desktop only |
| `KKanbanColumn` (data class)        | Yes     | —      | Used in Kanban test |

**Test fixture:** `pumpAt` helper uses `tester.binding.setSurfaceSize` (correct — this is the only way to drive `KResponsiveBuilder` per the file's own comment).

## Findings

### HIGH

*None.* Every in-scope module has at least one importing test, and every required scenario from the brief is covered.

### MEDIUM

**M1 — `KMessageType.toolCall` / `toolResult` / `assistantStreaming` never tested.**
Three of the seven message types advertised in the commit message ("7 message types") are never constructed in any test. The `_ToolCallCard` and `_ToolResultCard` private widgets (k_chat.dart lines 869–1047 — ~180 LOC) are therefore unreachable from the test suite. A regression that silently stops rendering tool calls would not be caught.
- **Recommendation:** add 2 widget tests that pump `KChatEngine` with `KMessageType.toolCall` and `KMessageType.toolResult` messages carrying real `KToolCallData` / `KToolResultData` payloads, and assert the tool name + summary render.

**M2 — `KActionPlan` modify and reject paths never tested.**
Only `KActionPlanAction.approve` is exercised. The `_ActionButton` modify/reject flows and the modification editor (k_chat.dart lines 1163–1396, ~230 LOC) are not executed once.
- **Recommendation:** add tests for (a) tapping "Reject" fires `onResponse` with `KActionPlanAction.reject`, (b) tapping "Modify" opens the editor and entering text fires `onResponse` with `KActionPlanAction.modify` + the modification string, (c) mixed-state header "1/3 reviewed" after one resolution.

**M3 — 9 of 11 templates never exercised at mobile breakpoint.**
Only `KAuthTemplate` and `KConversationTemplate` have mobile-size tests. The other 9 templates use `KResponsiveBuilder` to stack on mobile and split on desktop, but that stacking path is never rendered. A regression that breaks the mobile stack (e.g., inverting the breakpoint predicate) would ship undetected.
- **Recommendation:** add a single `mobile renders content only` test per template (9 tests) that asserts primary content visible + sidebar/secondary absent.

**M4 — `KChatFeatures` and `KChatInputConfig` never constructed.**
The feature-toggle class (`citations`, `toolCalls`, `actionPlans`, `suggestions`) and the input-config class (`placeholder`, `maxLength`, `disabled`, `allowAttachments`) are part of the public API but no test ever passes a non-default value. A regression in the feature-flag plumbing would not be caught.
- **Recommendation:** add 1–2 tests that pass `KChatFeatures(citations: false)` and assert the citation toggle does not render; 1 test that passes `KChatInputConfig(placeholder: 'Custom')` and asserts the placeholder text.

**M5 — `onCitationClick` and `onSuggestionClick` callbacks never tested.**
Both callbacks exist in `KChatEngine` but no test wires them up. Users clicking a citation or suggestion chip can reach a no-op silently if the callback wiring regresses.
- **Recommendation:** 2 tests — tap a suggestion chip → assert `onSuggestionClick` fires with the chip; tap a citation row → assert `onCitationClick` fires with the citation.

### LOW

**L1 — `KBadgeSize` enum not exercised.**
`KBadgeSize.sm` and `.md` are defined but no test iterates the enum (unlike `KButtonSize` and `KAvatarSize` which do). Trivial one-loop addition.

**L2 — Atom variant loops are weak tests.**
`renders all variants without errors` for KButton and KBadge only asserts that the child text still appears. They would pass even if all variants rendered identically. Consider adding one assertion that different variants produce different `Material` color values (fetch the first `Material` ancestor, compare colors across variants).

**L3 — a11y Semantics labels are not asserted.**
All four atoms (`KButton`, `KBadge`, `KAvatar`, `KSpinner`) and `KChatEngine` wrap content in `Semantics` per the commit message ("Full Semantics labels for a11y", "accessible live region label"). **No test asserts any semantic label.** The a11y contract is unverified.
- **Recommendation:** for each atom, add `tester.getSemantics(find.byType(KX))` and assert the expected `label`. For `KChatEngine`, assert `ariaLabel` prop propagates to a root Semantics node.

**L4 — `KButton` icon-slot props not exercised.**
Commit message advertises "icon slots" but tests only use `child: Text(...)`. Add one test with a leading icon + one with a trailing icon.

**L5 — `dot mode renders without child` KBadge test is tautological.**
`expect(find.byType(KBadge), findsOneWidget)` is true immediately after `pumpWidget(KBadge(...))`. Strengthen to `expect(find.byType(Text), findsNothing)` or assert the dot container shape.

**L6 — `KToolCallStatus.error` not exercised** (only queued/running/done appear in `KStreamOfThought` tests). Add one step with `status: KToolCallStatus.error`.

## Weak-Test Summary

- 2 atom variant/size loop tests assert only child visibility (M2 above, LOW).
- 1 KBadge dot-mode test is tautological (L5).
- 0 tests use mocks (mocking policy: clean).
- 0 widget tests bypass rendering (good — all use `pumpWidget` + real layout).

## Responsive & A11y Summary

- **Responsive:** 2 of 11 templates tested at mobile. M3 finding.
- **A11y:** 0 semantic-label assertions across ~1,992 LOC of new widget code. L3 finding.

## Severity Totals

- HIGH: 0
- MEDIUM: 5 (M1 through M5)
- LOW: 6 (L1 through L6)

## Recommendation

The parity work is **green** on the brief's hard checklist (all 10 KChatEngine required scenarios covered, every module imported, zero analyzer issues, 97/97 tests pass). The gaps are in **breadth of public surface**, **a11y contract verification**, and **mobile responsive paths** — none block Phase 1 completion but all should be closed before Phase 2 expands the surface further.

Minimum closure for sign-off: M1, M2, M3 (≈14 new tests). L3 should be a follow-up hardening pass across every atom + engine in the repo, not just the Phase 1 scope.
