# Flutter Parity Round 1 — Code Review

**Commit**: `e1b87cf` — feat(prism-flutter): Phase 1 parity — KChat + atoms + 11 templates
**Branch**: `feat/phase1-flutter-parity`
**Reviewer**: reviewer (red team round 1)
**Analyzer**: `flutter analyze` — No issues found. 0 warnings.
**Tests re-derived**: `flutter test test/chat_test.dart test/atoms_test.dart test/templates_test.dart` — 52 passed.

## Summary

Analyzer is clean and all 52 new tests pass. However, two features documented in
the commit body do not actually work at runtime, one of which ships with no test
coverage. Several minor Flutter correctness issues and one a11y overreach are
also flagged.

---

## CRITICAL

### C1. `Cmd/Ctrl+Enter` to send is dead code — documented feature never fires

**File**: `flutter/lib/engines/k_chat.dart`
**Lines**: 1509–1538, 1566–1588

`_KChatInputState` creates a local `FocusNode _focusNode` and wraps the TextField
in a `KeyboardListener(focusNode: _focusNode, onKeyEvent: _handleKeyEvent, child: TextField(...))`.

The `_focusNode` is never requested (no `autofocus`, no `FocusScope.of(context).requestFocus`,
no `_focusNode.requestFocus()`) and the TextField inside has its own (implicit) focus
node which consumes all key events. `KeyboardListener.onKeyEvent` only fires when
its `focusNode` has primary focus, so `_handleKeyEvent` never executes in normal
operation.

**Impact**: The commit message explicitly advertises
"Cmd/Ctrl+Enter to send". Users typing Cmd+Enter / Ctrl+Enter get a newline
(TextField default) and nothing sends. Feature is 100% non-functional.

**Rule violated**:
- `zero-tolerance.md` Rule 6 (Implement Fully) — feature is referenced and
  advertised but not functional.
- `rules/zero-tolerance.md` Rule 2 (No Stubs) — the keyhandler is a placeholder
  in disguise; it compiles but never runs.

**No test exists** for this feature (`grep -i 'Cmd\|Ctrl\|metaPressed\|controlPressed\|LogicalKeyboardKey.enter' flutter/test/chat_test.dart` → zero matches).

**Fix (sketch)**: Use a `Shortcuts`/`Actions` pair or a `CallbackShortcuts` widget
wrapping the TextField, OR intercept via `TextField`'s `onSubmitted` combined
with a raw `Focus` widget at the parent and `HardwareKeyboard.instance`
inspection on a real `KeyDownEvent` delivered to a focused `Focus(canRequestFocus: false, onKeyEvent: ...)`.
Add a widget test that sends a `LogicalKeyboardKey.enter` with meta modifier via
`tester.sendKeyEvent` + `HardwareKeyboard` and asserts `onSend` fires.

---

## HIGH

### H1. `KActionPlan` Save button state is stale — cannot enable on typing

**File**: `flutter/lib/engines/k_chat.dart`
**Lines**: 1163–1171, 1329–1363

`_KActionPlanState` owns `_editController = TextEditingController()` but never
registers a listener on it. `_buildEditor` computes:
```dart
onPressed: _editController.text.trim().isEmpty ? null : () => _submitModification(stepIndex),
```
at build time only. The `TextField(controller: _editController, ...)` inside has
no `onChanged` that calls `setState` either. Result: the Save button is
disabled on first build (controller is empty) and never re-enables as the user
types. The only way to submit a modification is by pressing Enter
(`onSubmitted: (_) => _submitModification`), which fortunately works.

**Impact**: Users who type a modification and then click Save instead of
pressing Enter will be blocked. Visible UI bug.

**Fix**: Either (a) add `_editController.addListener(() => setState(() {}))` in
initState + remove in dispose, or (b) add `onChanged: (_) => setState(() {})`
to the TextField, or (c) simply drop the disabled state and validate on click.

### H2. `_KChatEngineState.didUpdateWidget` can run post-frame after dispose

**File**: `flutter/lib/engines/k_chat.dart`
**Lines**: 244–263

```dart
WidgetsBinding.instance.addPostFrameCallback((_) {
  if (_scrollController.hasClients) {
    _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
  }
});
```

Missing `if (!mounted) return` inside the post-frame callback. If the widget is
rebuilt and then disposed (e.g., route pop while streaming), the callback fires
against a disposed `_scrollController`, and `_scrollController.hasClients` will
throw `AssertionError: A ScrollController was used after being disposed.`

**Impact**: Non-deterministic crash when navigating away from a chat during
active streaming.

**Fix**: Add `if (!mounted) return;` as the first line inside the callback.

---

## MEDIUM

### M1. `KChatEngine` declares `liveRegion: true` on the entire container

**File**: `flutter/lib/engines/k_chat.dart`
**Lines**: 286–290

The outermost `Semantics(liveRegion: true, container: true, ...)` wraps the
*entire* chat (message list + input + suggestions). Every time the TextField
content changes (each keystroke) the subtree rebuilds; screen readers will
re-announce the region description on every update. Per the review checklist
("every liveRegion claim is justified"), liveRegion should be scoped to the
message list or to the streaming bubble specifically — not the whole
conversation root including the input.

**Fix**: Move `liveRegion: true` to a `Semantics` wrapping only the message
`ListView` subtree. Keep the root `Semantics(label: ..., container: true)` without
liveRegion.

### M2. `KButton` ink effect hidden by decorated `Container`

**File**: `flutter/lib/atoms/k_button.dart`
**Lines**: 132–156

`Material(color: bg) > InkWell > Container(decoration: BoxDecoration(border: ..., borderRadius: ...))`
layers a decorated `Container` ON TOP of the `InkWell`. Ink splashes are
painted on the `Material` below the Container, so with `secondary`/`tertiary`
variants (which have borders) the ripple is visually clipped/obscured. This is
the canonical Flutter "ink under container" pitfall.

**Fix**: Move decoration onto the `Material` itself (`Material(shape: RoundedRectangleBorder(side: tokens.border, borderRadius: ...), color: tokens.bg)`) and drop the Container decoration. Or flip the layering so `Ink` wraps the decoration.

### M3. `_KChatInputState` `_onChanged` listener rebuilds on every keystroke without mounted check

**File**: `flutter/lib/engines/k_chat.dart`
**Lines**: 1525

```dart
void _onChanged() => setState(() {});
```

If the parent strips this input while the user is actively typing, the
listener can fire after dispose. Low probability but trivially guarded.

**Fix**: `void _onChanged() { if (mounted) setState(() {}); }`.

---

## LOW

### L1. `ListView.separated` children lack explicit keys

**File**: `flutter/lib/engines/k_chat.dart` lines 1440–1476 (suggestion chips);
`flutter/lib/templates/k_templates.dart` lines 637–697 (Kanban columns).

Horizontal scroll lists where items can be added/removed/reordered benefit from
`ValueKey(suggestion.value)` / `ValueKey(col.id)` to preserve scroll position
and state on reorder. Non-blocking.

### L2. `KAvatar` has no `loadingBuilder` for network image

**File**: `flutter/lib/atoms/k_avatar.dart` lines 57–66

`Image.network` with only `errorBuilder` will flash a blank circle during
load. A `loadingBuilder` returning `_buildInitials(px)` would avoid the flash.
Cosmetic.

### L3. `_KChatEngineState._handleSend` calls `setState(() {})` redundantly

**File**: `flutter/lib/engines/k_chat.dart` line 270

`_inputController.clear()` already triggers the controller listener in
`_KChatInputState._onChanged` which calls `setState` on the child. The explicit
`setState(() {})` in the parent also fires, causing a superfluous parent
rebuild (cheap but noisy under profile mode).

### L4. `_KChatEngineState._handleSuggestionTap` bypasses onSend when set

**File**: `flutter/lib/engines/k_chat.dart` lines 273–280

When `onSuggestionClick` is null, tapping a suggestion populates the input
field via `_inputController.text = chip.value`. This is correct behavior but
the input field will not auto-focus after the write, which is a mild UX
regression vs the web equivalent. Cosmetic.

### L5. `KAuthTemplate` uses hardcoded `Color(0x1A000000)` shadow

**File**: `flutter/lib/templates/k_templates.dart` line 407

Should route through `PrismColors` for shadow tokens. Minor token-consistency
violation.

### L6. `_KChatMessageBubble` hardcodes several spacing/radius values

**File**: `flutter/lib/engines/k_chat.dart` lines 498, 522–526, 550, 579, 583–587

Multiple `EdgeInsets.symmetric(vertical: 4)`, `padding: EdgeInsets.all(12)`,
`BorderRadius.circular(8)`, `Radius.circular(12)`, `Radius.circular(2)` rather
than `PrismSpacing`/`PrismRadius` tokens. Token-consistency drift against the
existing `k_form.dart` / `k_navigation.dart` / `k_data_table.dart` convention.
Non-blocking since the analyzer passes, but should be folded into a polish
pass.

### L7. Error-card uses hardcoded `Color(0xFFFEF2F2)` / `Color(0xFFF0FDF4)` / `Color(0xFFFEF3C7)` / `Color(0xFFFFFBEB)` / `Color(0xFFEFF6FF)`

**Files**:
- `flutter/lib/engines/k_chat.dart` lines 524, 838, 1197–1202, 1307
- `flutter/lib/atoms/k_badge.dart` lines 32–38

Status-tint backgrounds are not in `PrismColors`. These exact literal values
are repeated 5+ times. Not a defect but a future token-extraction opportunity.

### L8. Tests assert existence not semantics for button enablement

**File**: `flutter/test/chat_test.dart` lines 139–153

`send button disabled when input is empty` taps the InkWell and asserts
`sent == null`, which tests effect but does not assert the button's Semantics
`enabled: false`. Recommend using `tester.getSemantics` + `matchesSemantics(isButton: true, isEnabled: false)`.

### L9. `chat_test.dart` retry button tap missing `await tester.pump()` before assertion

**File**: `flutter/test/chat_test.dart` line 114–115

```dart
await tester.tap(find.text('Retry'));
expect(retriedId, 'e1');
```

Works because the callback fires synchronously during tap dispatch, but any
future async refactor to `onRetry` would fail silently. Idiomatic fix:
`await tester.tap(...); await tester.pump();`.

---

## Checklist Results

| Check | Result |
|---|---|
| Stubs / TODOs / FIXMEs | Clean (no markers in scope files) |
| Mock/fake/dummy constants | Clean |
| Silent error swallowing | Clean (no empty catches) |
| Half-implemented features | **C1 (Cmd/Ctrl+Enter)** |
| Missing dispose / super.dispose | Clean (all controllers disposed) |
| setState after async without mounted | **H2 (didUpdateWidget), M3 (_onChanged)** |
| Competing Expanded/Flexible | Clean |
| Missed `const` constructors | Clean (analyzer would catch) |
| Widget? vs required Widget | Clean |
| Missing Key in list builders | **L1** |
| a11y: Semantics on interactive widgets | Clean |
| a11y: IconButton label | Clean (attach_file, send message labeled) |
| a11y: liveRegion justified | **M1 (over-scoped)** |
| K-prefix naming consistency | Clean |
| required-first param ordering | Clean |
| Token usage vs hardcoded | **L5, L6, L7 (cosmetic drift)** |
| Tests assert behavior not existence | Mostly clean, **L8** minor |
| `await tester.pump()` where needed | Mostly clean, **L9** minor |
| `setSurfaceSize` correctly used | Clean |
| `find.text` vs RichText trap | Clean (streaming uses Row+Text, not RichText) |

## Flutter Analyze

```
$ cd flutter && flutter analyze
Analyzing flutter...
No issues found! (ran in 0.7s)
```

## Test Re-derivation

```
$ flutter test test/chat_test.dart test/atoms_test.dart test/templates_test.dart
00:00 +52: All tests passed!
```

Coverage of new modules verified via direct import:
- `test/chat_test.dart` imports `package:kailash_prism/kailash_prism.dart` which re-exports `k_chat.dart` — 16 tests
- `test/atoms_test.dart` covers KButton (7), KBadge (3), KAvatar (7), KSpinner (2) — 19 tests
- `test/templates_test.dart` covers 11 templates + KTemplateHeader — 17 tests

Gap: no test exercises `KChatFeatures(toolCalls: false)` filtering path, no
test exercises citation `confidence > 0.8` tint path, no test for `KActionPlan`
modify editor, no test for Cmd/Ctrl+Enter send (see C1).
