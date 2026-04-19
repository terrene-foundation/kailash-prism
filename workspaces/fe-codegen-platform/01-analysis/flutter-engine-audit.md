# Flutter Engine Parity Audit — S4

**Date:** 2026-04-19
**Scope:** What `flutter/` ships today vs what the Prism specs promise.
**Method:** Static audit of `flutter/lib/`, `compiler/src/flutter.ts`, `compiler/generated/flutter/`, cross-referenced against `docs/specs/05-engine-specifications.md`, `docs/specs/07-cross-platform-strategy.md`, `specs/components/*.yaml`, and `.claude/CLAUDE.md`. `flutter analyze` and `flutter test` were run (Flutter 3.41.2 / Dart 3.11.0 available at `/Users/esperie/repos/dev/flutter/bin/`).

---

## Executive Summary

1. **Five of six engines ship as widgets; one (Theme) is implemented but disconnected from the compiler.** DataTable, Form, Navigation, Layout, and AI Chat (+ AI Chat Sidebar) exist in `flutter/lib/engines/` (`flutter/lib/engines/k_data_table.dart:54`, `k_form.dart:1`, `k_navigation.dart:5`, `k_chat.dart:1`, `k_chat_sidebar.dart`). Layout lives separately in `flutter/lib/layouts/k_layout.dart:1`. Theme ships as hand-authored `flutter/lib/theme/prism_theme.dart:16` + `prism_colors.dart:5` + `prism_spacing.dart` + `prism_typography.dart`.

2. **Biggest parity gap is the token pipeline, not the engines.** `compiler/src/flutter.ts:236` produces `compiler/generated/flutter/prism_tokens.dart` + `prism_theme.dart` at build time, but `flutter/lib/` imports from hand-authored `flutter/lib/theme/prism_colors.dart`, not the generated output. The two Dart token sources diverge silently — the generated `prism_tokens.dart` defines `PrismColors.navy600`, `PrismSpacing.s4`, etc., while the hand-authored `prism_colors.dart:5` has a different set of semantic names (`interactivePrimary`, `surfacePage`, `borderDefault`). This violates the `.claude/CLAUDE.md` Absolute Directive 2 ("Token compiler is the single path from design intent to implementation").

3. **Riverpod is specified but completely absent.** `docs/specs/07-cross-platform-strategy.md:49` and `.claude/CLAUDE.md:121` both mandate Riverpod + AsyncValue. Grep for `Riverpod|ConsumerWidget|AsyncValue|StateNotifier` across `flutter/` returns zero matches; `pubspec.yaml:12-19` declares only `flutter`, `flutter_test`, and `flutter_lints`. State management is `StatefulWidget` + `setState` throughout (e.g. `k_data_table.dart:90`, `k_form.dart`, `k_chat.dart`).

4. **Hardcoded values everywhere — token-driven design directive is violated.** 104 raw `Color(0x…)` / `fontSize: <number>` / `EdgeInsets.all(<number>)` occurrences across the five engine files (grep count: `k_chat.dart` 53, `k_chat_sidebar.dart` 21, `k_data_table.dart` 14, `k_form.dart` 9, `k_navigation.dart` 7). Example: `k_data_table.dart:536` uses `Color(0xFFFEF2F2)` inline.

5. **Flutter widget atoms are a subset of the web atom set.** Flutter ships 4 atoms (`KButton`, `KBadge`, `KAvatar`, `KSpinner`). Web ships 5 atoms (`Button`, `Badge`, `Avatar`, `Spinner`, `Card`) — plus 68 component contracts in `specs/components/*.yaml`. No molecules (`flutter/lib/molecules/` contains only `.gitkeep`), no organisms (`flutter/lib/organisms/` contains only `.gitkeep`), no providers (`flutter/lib/providers/` contains only `.gitkeep`), no `ai/` atoms (`flutter/lib/ai/` contains only `.gitkeep`).

6. **Tests run but one fails; one engine spec claim (Chat date grouping) is broken.** `flutter test` reports 140 pass / 1 fail (`KConversationSidebar — collapsed shows icon strip in collapsed mode`, expected "Today" grouping label). `flutter analyze` reports "No issues found! (ran in 1.4s)". Zero Dart linter warnings.

---

## Engine-by-Engine Parity Table

Spec source: `docs/specs/05-engine-specifications.md` enumerates DataTable, Form, Navigation, Layout, Theme, AI Chat.

| Engine | Spec'd? | Web shipped? | Flutter shipped? | Gap notes |
|---|---|---|---|---|
| **DataTable** | Yes (Spec 05 §5.1) | Yes — `web/src/engines/data-table/` split into 12 files (`data-table-root.tsx`, `data-table-header.tsx`, `data-table-body.tsx`, `data-table-bulk-actions.tsx`, `data-table-pagination.tsx`, `data-table-mobile.tsx`, `use-data-table.ts`, `adapter.ts`, `types.ts`, `sanitize-href.ts`, `data-table-states.tsx`, `index.ts`). Card-grid mode added (0.3.1, commit `01b1c1d`). | Yes — `flutter/lib/engines/k_data_table.dart` (549 LOC, single file). Features: sort, filter (global search only), paginate, bulk actions, selection, mobile card-list, empty/error states. | **Single-file at 549 LOC exceeds the 200-line directive** (`.claude/CLAUDE.md:123`). **No card-grid mode** (web 0.3.1 added it; Flutter has a basic `_CardListBody` used only for mobile). **No per-column filtering** — only global search. **No DataTableAdapter interface** (web 0.2.2 added it); Flutter exposes only imperative `List<T> data` prop. **No virtual scroll / sliver-based list** (Spec 07 §7.4 performance rule "all scrollable lists with >20 items use `SliverList.builder`"). |
| **Form** | Yes (Spec 05 §5.2) | Yes — `web/src/engines/form/` split into 4 files (`form-root.tsx`, `form-fields.tsx`, `form-wizard.tsx`, `form-types.ts`). FormAdapter interface landed in 0.2.1. | Yes — `flutter/lib/engines/k_form.dart` (611 LOC, single file). Features: 12 field types (text/email/password/url/tel/number/textarea/dropdown/radio/checkbox/toggle/date), validation rules, conditional visibility, `KCondition` evaluator. | **Exceeds 200-line directive.** **No FormAdapter interface** (web 0.2.1 parity missing). **No wizard mode** (web ships `form-wizard.tsx`). Form state is local `StatefulWidget` `setState`, not Riverpod. No async submission / AsyncValue loading state. |
| **Navigation** | Yes (Spec 05 §5.3) | Yes — `web/src/engines/navigation.tsx`. | Yes — `flutter/lib/engines/k_navigation.dart` (419 LOC). Features: `KRouteNode` tree, `KRouteMatcher` (prefix + exact), breadcrumbs, sidebar collapsed state, badges. | **No GoRouter integration** (Spec 07 §7.4 mandates GoRouter; pubspec has no `go_router` dep). Navigation state is a passed-through object, not a Riverpod provider. Platform-adaptive behavior (Spec 07 §7.4 table — Cupertino on iOS) not implemented. |
| **Layout** | Yes (Spec 04 + 05) | Yes — `web/src/engines/layout.tsx` + layout primitives in atoms. | Yes — `flutter/lib/layouts/k_layout.dart` (157 LOC) + `k_responsive.dart` (124 LOC). Implements `KStack`, `KBreakpoint`, `KResponsiveValue`, `KResponsiveBuilder`. Breakpoints match web (mobile 0, tablet 768, desktop 1024, wide 1440). | **Only KStack — missing Grid, Split, Layer, Scroll primitives** (Spec 04 §4.2 grammar defines 6 primitives; web ships all 6; Flutter has only Stack). Spec 07 §7.4 requires `flutter_staggered_grid_view` for Grid column spanning — dep not declared. |
| **Theme** | Yes (Spec 02 + 05) | Yes — `web/src/engines/theme.tsx`. | Partial — `flutter/lib/theme/prism_theme.dart` (128 LOC, hand-authored) + `prism_colors.dart` (57 LOC, hand-authored). Produces `ThemeData` via `PrismTheme.light()` / `PrismTheme.dark()`. | **The hand-authored theme is disconnected from the compiler.** `compiler/generated/flutter/prism_tokens.dart` + `prism_theme.dart` are generated but not imported by `flutter/lib/`. Hand-authored `prism_colors.dart:5` uses semantic names (`interactivePrimary`) that differ from the generated `prism_tokens.dart:10` primitive-only output (`navy600`). Changes to `specs/tokens/themes/enterprise.yaml` do NOT flow to `flutter/lib/`. This is the biggest single parity gap. |
| **AI Chat** | Yes (Spec 05 §5.6) | Yes — `web/src/engines/ai-chat/` split into 10 files (`chat-engine.tsx`, `chat-input.tsx`, `chat-message.tsx`, `conversation-sidebar.tsx`, `stream-of-thought.tsx`, `action-plan.tsx`, `suggestion-chips.tsx`, `use-chat-state.ts`, `types.ts`, `index.ts`). | Yes — `flutter/lib/engines/k_chat.dart` (1,694 LOC) + `k_chat_sidebar.dart` (910 LOC). Features: 7 message types, streaming cursor, stream-of-thought, action plan approve/modify/reject, suggestion chips, Ctrl/Cmd+Enter, citation panel. | **1,694 LOC in a single file — 8x over the 200-line directive.** No Kaizen streaming client (Spec 05 §5.6 calls for agent streaming); chat state is local `setState` with a user-supplied `onSubmit` callback. One failing test: `chat_sidebar_test.dart` "KConversationSidebar — collapsed shows icon strip in collapsed mode" — expected "Today" grouping label, found 0 widgets. |

---

## Atom-Level Inventory

**Flutter atoms** (`flutter/lib/atoms/`):

| K-prefix name | File | LOC | Matching web atom? |
|---|---|---|---|
| `KButton` | `k_button.dart` | 158 | Yes — `web/src/atoms/button.tsx` |
| `KBadge` | `k_badge.dart` | 81 | Yes — `web/src/atoms/badge.tsx` |
| `KAvatar` | `k_avatar.dart` | 91 | Yes — `web/src/atoms/avatar.tsx` |
| `KSpinner` | `k_spinner.dart` | 44 | Yes — `web/src/atoms/spinner.tsx` |

**Web atoms present in `web/src/atoms/`:** `button.tsx`, `badge.tsx`, `avatar.tsx`, `spinner.tsx`, `card.tsx` — 5 atoms.

**Flutter atom gap:** `KCard` is missing. `web/src/atoms/card.tsx` shipped in 0.3.1; no equivalent in `flutter/lib/atoms/`. `KCard` usages inside engines use raw Material `Card` instead (e.g. `k_data_table.dart:366`, `k_chat.dart`).

**Specs vs. implemented atoms:** `specs/components/` contains 68 YAML component contracts. Flutter implements 4. Web implements 5. Neither platform is close to the spec'd surface; this was expected for the phase-1 "build by migrating real projects" approach (see MEMORY `project_phase2_arbor.md`), but the Flutter delta against web is 1 atom (Card) and ~0 molecules/organisms.

**Empty folders** (`.gitkeep`-only):
- `flutter/lib/molecules/` — web has no populated molecules either, so no delta
- `flutter/lib/organisms/` — web has `card-grid.tsx`; Flutter delta = 1 organism (KCardGrid)
- `flutter/lib/ai/` — web has AI atoms split across `web/src/engines/ai-chat/`; Flutter has everything inlined in `k_chat.dart`
- `flutter/lib/providers/` — should house Riverpod providers per pubspec/spec; currently empty

---

## Token Compiler Audit

**Compiler ships a Flutter target.** `compiler/src/flutter.ts` exports `emitDartConstants()` (produces `prism_tokens.dart` — primitive colors/spacing/typography/radius/motion/breakpoints) and `emitThemeData()` (produces `prism_theme.dart` — light + dark `ThemeData` factories). `compiler/src/cli.ts` invokes it; output lives at `compiler/generated/flutter/prism_tokens.dart` and `compiler/generated/flutter/prism_theme.dart`.

**Compiler output is NOT consumed by `flutter/lib/`.** Grep for `prism_tokens` inside `flutter/lib/` returns zero matches. The `flutter/lib/theme/` directory contains hand-authored `prism_colors.dart`, `prism_spacing.dart`, `prism_theme.dart`, `prism_typography.dart` — none of which are imports of the generated files.

**Evidence of divergence:**
- `compiler/generated/flutter/prism_tokens.dart:5` exposes `abstract final class PrismColors` with primitive `navy100..navy900`, `gray50..gray900`.
- `flutter/lib/theme/prism_colors.dart:5` exposes `abstract final class PrismColors` with primitives (`navy100..navy900`) PLUS hand-added semantic aliases (`interactivePrimary`, `surfacePage`, `borderDefault`, `statusError`, etc.) that do NOT exist in the generated output.

**Impact:** A theme edit to `specs/tokens/themes/enterprise.yaml` → `prism-compile` → `compiler/generated/flutter/*.dart` never reaches the Flutter app. Every engine file imports `../theme/prism_colors.dart`, which is manually synced. This breaks `.claude/CLAUDE.md` Absolute Directive 2 and invalidates the "one design spec, four platform outputs" claim for the Flutter target.

**Recommendation scope** (see roadmap §R1 below): one session to wire `compiler/generated/flutter/*.dart` into `flutter/lib/theme/` (either via `tools/` script that copies at build time OR a `flutter pub run build_runner` hook OR a direct import of the generated path) and delete the hand-authored divergence.

---

## Riverpod Discipline

**Spec claim:** `.claude/CLAUDE.md:121` — "Riverpod for state management". `docs/specs/07-cross-platform-strategy.md:49` — "Riverpod + AsyncValue". `docs/specs/07-cross-platform-strategy.md:247` — "AsyncValue | All async data uses Riverpod `AsyncValue` (loading/error/data)".

**Audit result:** Zero Riverpod.

- `flutter/pubspec.yaml:12-19` declares `flutter`, `flutter_test`, `flutter_lints` only. No `flutter_riverpod`, `hooks_riverpod`, or `riverpod`.
- Grep `Riverpod|riverpod|ConsumerWidget|AsyncValue|StateNotifier` across `flutter/` → zero matches.
- Every stateful engine uses `StatefulWidget` + `setState` for local state. Examples: `k_data_table.dart:90` (`_KDataTableState`), `k_form.dart` form state, `k_chat.dart` chat message list, `k_navigation.dart` via pass-through `KNavigationState` object.
- Engines expose state through constructor parameters + callback closures. No `AsyncValue<List<Message>>` pattern anywhere; loading is a plain `bool loading` prop (see `k_data_table.dart:66`).

**Impact:** Spec 07 performance rules (§7.4) reference `AsyncValue` as the mandated async data pattern. Testing patterns in `.claude/rules/testing.md` include `ProviderScope` wrappers and `ProviderContainer` unit tests — none of which apply because there are no providers. Downstream consumer apps (arbor, etc.) that adopt `kailash_prism` will wrap engines in their own Riverpod providers, re-implementing loading/error/data reconciliation that the spec says Prism owns.

**Recommendation scope:** two sessions — one to add `flutter_riverpod` dep and convert engine state to providers, one to migrate AI Chat streaming to `AsyncValue<ChatMessage>` + `StateNotifier<ChatState>`.

---

## Test Coverage

**`flutter analyze` result:** "No issues found! (ran in 1.4s)". Clean. Zero Dart analyzer warnings.

**`flutter test` result:** 140 tests pass, 1 fails. Total LOC across `flutter/test/`: 2,369.

Test file inventory:

| File | LOC | Engine/atom covered |
|---|---|---|
| `atoms_test.dart` | 172 | KButton, KBadge, KAvatar, KSpinner |
| `theme_test.dart` | 84 | PrismTheme.light/dark, PrismColors |
| `layout_test.dart` | 92 | KStack, KResponsive |
| `navigation_test.dart` | 105 | KNavigation route matching, breadcrumbs |
| `data_table_test.dart` | 154 | KDataTable sort/filter/paginate/select |
| `form_test.dart` | 188 | KForm validation, conditional visibility |
| `chat_test.dart` | 517 | KChatEngine messages, streaming, tool calls, action plan |
| `chat_sidebar_test.dart` | 567 | KConversationSidebar rename/delete/collapse |
| `templates_test.dart` | 490 | KDashboardTemplate, KKanbanTemplate, KWiredConversationTemplate |

**Failing test:**
- `chat_sidebar_test.dart` — `KConversationSidebar — collapsed shows icon strip in collapsed mode`
- Error: `Expected: exactly one matching candidate / Actual: _TextWidgetFinder:<Found 0 widgets with text "Today">`
- Root cause (inferred, not verified): the conversation date-grouping logic expects a "Today" label in the collapsed view, but the widget tree doesn't render it.
- This is a Rule-1 violation under `.claude/rules/zero-tolerance.md` if left untouched.

**Integration tests:** `flutter/integration_test/` — directory does not exist. Spec 07 §7.4 mentions integration test tier; this tier is absent entirely.

**Golden screenshot tests:** `golden_toolkit` not declared; no golden tests exist.

---

## Recommended Flutter Parity Roadmap

Sessions are autonomous-execution cycles per `.claude/rules/autonomous-execution.md`. Each shard is sized to stay within the ~500 LOC load-bearing / ≤5-10 invariant budget.

### R1 — Wire the token compiler output into `flutter/lib/theme/` (1 session)

**Invariants:** Generated `prism_tokens.dart` is the single source; hand-authored `prism_colors.dart` is deleted; every engine's `Color(0x...)` literal maps to a generated semantic token; `flutter analyze` stays clean.

- Replace `flutter/lib/theme/prism_colors.dart`, `prism_spacing.dart`, `prism_typography.dart` with re-exports of `compiler/generated/flutter/prism_tokens.dart`.
- Add a build script (`flutter/tools/sync_tokens.sh` or a `build_runner` hook) that invokes `npx prism-compile --theme enterprise --target flutter` and writes into `flutter/lib/theme/_generated/`.
- Extend `compiler/src/flutter.ts:emitThemeData()` to also emit the semantic aliases (`interactivePrimary`, `surfacePage`, `borderDefault`, etc.) the hand-authored `prism_colors.dart` currently provides — otherwise engine imports break.
- Regression test: add `flutter/test/theme_generated_test.dart` that asserts `PrismColors.interactivePrimary` exists and matches the hex value in `specs/tokens/themes/enterprise.yaml`.

### R2 — Fix failing test + enforce 200-line rule via shard-per-engine split (2 sessions)

**Session 1 invariants:** 0 failing tests; 0 files >200 LOC in `flutter/lib/engines/` after split.
- Fix `KConversationSidebar — collapsed shows icon strip in collapsed mode` (missing "Today" label). Regression test stays.
- Split `k_data_table.dart` (549) into `data_table/k_data_table.dart` (root) + `header.dart` + `body.dart` + `pagination.dart` + `bulk_actions.dart` + `mobile.dart` + `types.dart`, mirroring `web/src/engines/data-table/`.
- Split `k_form.dart` (611) into `form/k_form.dart` + `fields.dart` + `validation.dart` + `types.dart`.

**Session 2 invariants:** AI Chat split mirrors `web/src/engines/ai-chat/`.
- Split `k_chat.dart` (1,694) into `ai_chat/k_chat_engine.dart` + `chat_input.dart` + `chat_message.dart` + `stream_of_thought.dart` + `action_plan.dart` + `suggestion_chips.dart` + `types.dart` + `use_chat_state.dart`.
- Split `k_chat_sidebar.dart` (910) into `ai_chat/conversation_sidebar/*.dart`.

### R3 — Add Riverpod + AsyncValue (2 sessions)

**Session 1:** add `flutter_riverpod` dep, introduce a ProviderScope at the root, convert DataTable state (`_KDataTableState` → `DataTableController extends Notifier`) and Form state to providers. Invariants: existing widget test API unchanged (tests wrap widgets in `ProviderScope`); external consumer API adds an optional `controller` parameter but defaults to internal provider.

**Session 2:** convert AI Chat streaming to `StateNotifier<ChatState>` with `AsyncValue<List<ChatMessage>>`; add `providers/chat_provider.dart`, `providers/data_table_provider.dart`, `providers/form_provider.dart` to `flutter/lib/providers/`.

### R4 — Add missing layout primitives (Grid, Split, Layer, Scroll) (1 session)

**Invariants:** Spec 04 §4.2 grammar has exactly 6 primitives; Flutter implements all 6.
- Add `flutter_staggered_grid_view` dep (Spec 07 §7.4).
- Implement `KGrid`, `KSplit`, `KLayer`, `KScroll` in `flutter/lib/layouts/`.
- Regression test each primitive at mobile/tablet/desktop breakpoints.

### R5 — Add KCard atom + KCardGrid organism (1 session)

**Invariants:** DataTable card-grid mode (web 0.3.1) ports to Flutter; `flutter/lib/atoms/k_card.dart` ≤ 150 LOC; `flutter/lib/organisms/k_card_grid.dart` ≤ 200 LOC.
- Mirror `web/src/atoms/card.tsx` and `web/src/organisms/card-grid.tsx` API surface.
- Update KDataTable to accept `viewMode: KViewMode.table | KViewMode.cardGrid`.

### R6 — GoRouter integration (1 session)

**Invariants:** `kailash_prism` exports a `KPrismRouter` wrapper around GoRouter that consumes `List<KRouteNode>`; platform-adaptive nav (CupertinoTabBar on iOS) wired per Spec 07 §7.4 platform matrix.

### R7 — Integration test tier + golden screenshots (2 sessions)

**Session 1:** add `flutter/integration_test/` with real-infrastructure tests for each engine (Spec 07 §7.4 + `.claude/rules/testing.md`).
**Session 2:** add `golden_toolkit` dep, produce golden screenshots for each atom + engine in light + dark theme.

**Total estimated effort:** 10 autonomous-execution sessions for full parity (excluding the 68 unimplemented component atoms in `specs/components/`).

---

## Open Questions

1. **Token compiler vs. hand-authored semantic tokens.** The generated `prism_tokens.dart` emits primitive tokens only (`navy600`, `gray100`); the hand-authored `prism_colors.dart` layers on semantic aliases (`interactivePrimary`). **Decision needed:** does `emitDartConstants()` extend to semantic tokens (so generated output can fully replace hand-authored), or does Flutter always keep a thin semantic-aliases layer that lives in `flutter/lib/theme/semantic_aliases.dart`? The web side resolves this via CSS custom properties; Dart has no equivalent fallback chain, so the decision is load-bearing.

2. **Lockstep versioning.** Spec 07 §7.6 requires all packages share the same version. `flutter/pubspec.yaml:3` reports `0.1.0` while `web/package.json` is on the 0.3.x train (commit `01b1c1d`). Two interpretations: (a) Flutter is pre-release and lockstep starts at 1.0; (b) lockstep is already active and Flutter is in violation. **Decision needed.**

3. **FormAdapter / DataTableAdapter parity.** Web 0.2.1 and 0.2.2 introduced FormAdapter and DataTableAdapter interfaces. Flutter has neither. **Decision needed:** does Flutter port the adapter interfaces verbatim (strongly typed), or use Dart idioms (abstract class / mixin)?

4. **AI Chat streaming source.** Spec 05 §5.6 says AI Chat engine connects to Kaizen. Flutter's `k_chat.dart` accepts a user-supplied `onSubmit` callback with no streaming abstraction. **Decision needed:** does Flutter add a `KaizenChatClient` + `StreamNotifier` pattern, or stay callback-driven and let consumers wire Riverpod themselves?

5. **Next session scope.** The Phase 2 arbor migration (MEMORY `project_phase2_arbor.md`) targets web. Does the Flutter parity roadmap R1-R7 run in parallel against a Flutter pilot project (arbor-mobile, coursewright-mobile), or sequentially after web engines stabilize at 1.0?

6. **Integration-test infra.** Flutter has no `integration_test/` directory. Running Tier 2 integration tests needs a real device or emulator. **Decision needed:** does CI provision an Android emulator + iOS simulator in the Flutter test matrix, or is Tier 2 Flutter testing deferred until post-1.0?

---

**Surprise gaps:**

1. **The compiler produces Flutter output that nothing imports.** This is the biggest surprise — the `compiler/generated/flutter/` directory is regenerated on every `prism-compile` run but is effectively dead code. Every Flutter engine imports `../theme/prism_colors.dart` instead. The "one design spec, four platform outputs" manifest claim is broken at the Flutter target.

2. **Riverpod is zero, not partial.** Expected to find at least a few providers; found literally none. The pubspec doesn't even declare the dependency.

3. **All five engines exceed the 200-line directive.** `k_chat.dart` is 1,694 LOC (8.4x over); `k_form.dart` 611; `k_data_table.dart` 549; `k_chat_sidebar.dart` 910; `k_navigation.dart` 419. `.claude/CLAUDE.md:123` is unambiguous: "Maximum 200 lines per widget file." No file in `flutter/lib/engines/` complies.

---

**Audit document path:** `/Users/esperie/repos/loom/kailash-prism/workspaces/fe-codegen-platform/01-analysis/flutter-engine-audit.md`
