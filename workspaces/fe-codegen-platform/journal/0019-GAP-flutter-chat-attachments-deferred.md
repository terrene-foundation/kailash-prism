---
type: GAP
date: 2026-04-12
created_at: 2026-04-12T22:10:00+08:00
author: co-authored
session_id: redteam-flutter-parity
session_turn: round1
project: fe-codegen-platform
topic: Flutter KChat file-attachment UX deferred to Phase 2
phase: redteam
tags: [flutter, k-chat, attachments, phase-2, parity-gap]
---

# GAP: Flutter KChat Attachment UX Deferred to Phase 2

## What was found

Red team Round 1 on PR #2 (feat/phase1-flutter-parity) flagged the attachment
button in `flutter/lib/engines/k_chat.dart` as a zero-tolerance Rule 2 stub.
The initial implementation wired:

```dart
onAttach: widget.input.allowAttachments && widget.onSend != null
  ? (files) => widget.onSend!(KChatSendEvent(content: '', attachments: files))
  : null,
// ...
IconButton(
  icon: const Icon(Icons.attach_file, size: 20),
  onPressed: () => widget.onAttach!(const []),   // <-- hardcoded empty list
)
```

The IconButton fired `onAttach` with `const []` — no file picker, no platform
channel, no actual file selection. The commit body advertised attachment
support, but the implementation was a fake: a button that calls a callback
with zero files. The web version has a real `<input type="file">` with
`multiple` attribute.

## What was done

The attach button, `KChatInputConfig.allowAttachments` field, and the
`_KChatInput.onAttach` wiring were **removed entirely** in Round 1 fixes
(commit TBD). The `KChatSendEvent.attachments` field was retained (documented
as reserved for future use) so the public contract can absorb Phase 2
attachment support without breaking existing consumers.

Rationale (zero-tolerance Rule 6 — "If you cannot implement: ask the user
what it should do, then do it. If user says 'remove it,' delete the
function"): a real Flutter file picker requires a platform-channel package
(e.g. `file_picker` on pub.dev) with per-platform native setup (iOS
Info.plist keys, Android permissions, desktop file-type filters). That is
scope creep from "parity with web" — the web version expects real files
and the Flutter version should be equally real or removed. Adding the
dependency was not in the Phase 1 envelope.

## What Phase 2 must do

1. Add `file_picker` to `flutter/pubspec.yaml` dependencies.
2. Configure per-platform native permissions (iOS Info.plist, Android
   manifest, desktop file-type filters).
3. Re-add `allowAttachments: bool` to `KChatInputConfig`.
4. Implement an attach button that calls `FilePicker.platform.pickFiles(
   allowMultiple: true)`, converts results to `List<String>` of paths (or
   whatever the platform returns), and fires `onSend(KChatSendEvent(
   content: '', attachments: paths))`.
5. Add a widget test that mocks the FilePicker channel and verifies the
   selected files reach `onSend`.
6. Surface a basic attachment-preview strip above the input (this exists
   in web as well — see `web/src/engines/ai-chat/chat-input.tsx`).

## Why this matters

Users wiring KChatEngine to a Kaizen backend in Phase 2 will expect the
same attachment UX as the web version. Shipping a fake button that
advertised attachment support would have silently broken user trust when
tapping it did nothing — classic zero-tolerance Rule 2 failure mode. The
removal is the correct call; the journal entry ensures Phase 2 picks up
the work.

## For Discussion

- Should the attach-file package be `file_picker` or a Terrene-Foundation-
  owned alternative? The orphan-detection rule cautions against unmaintained
  deps, but `file_picker` has active maintenance and broad platform support.
  Worth confirming with the `align-specialist` before Phase 2 imports it.
- Does Phase 2 also need drag-and-drop file support on desktop? Web gets
  this for free via browser HTML5; Flutter desktop needs an explicit
  `DropTarget` widget.
- Should the `KChatSendEvent.attachments` field's type change from
  `List<String>?` to something richer (filename + bytes + mime) before
  Phase 2 starts using it? Changing the type later is a breaking change
  on a public contract.
