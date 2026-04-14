import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

// ============================================================================
// Fixtures
// ============================================================================

final _now = DateTime(2026, 4, 14, 14, 0);

KConversationSummary _conv(String id, String title, DateTime timestamp,
    {String? lastMessage}) {
  return KConversationSummary(
    id: id,
    title: title,
    timestamp: timestamp,
    lastMessage: lastMessage,
    messageCount: 3,
  );
}

List<KConversationSummary> _conversations() => [
      _conv('c1', 'Today chat', _now, lastMessage: 'Hello there'),
      _conv('c2', 'Yesterday chat', _now.subtract(const Duration(days: 2)),
          lastMessage: 'Previous discussion'),
      _conv('c3', 'Old chat', _now.subtract(const Duration(days: 14)),
          lastMessage: 'Way back when'),
    ];

/// Mock adapter for KChatState tests.
class _MockAdapter extends KChatAdapter {
  List<KConversationSummary> Function()? onListConversations;
  List<KChatMessage> Function(String)? onLoadMessages;
  _MockStreamHandle Function(String?, String)? onSendMessage;
  int deleteCount = 0;
  int renameCount = 0;
  String? lastRenameId;
  String? lastRenameTitle;

  @override
  Future<List<KConversationSummary>> listConversations() async {
    return onListConversations?.call() ?? _conversations();
  }

  @override
  Future<List<KChatMessage>> loadMessages(String conversationId) async {
    return onLoadMessages?.call(conversationId) ?? [];
  }

  @override
  KChatStreamHandle sendMessage(String? conversationId, String content) {
    return onSendMessage?.call(conversationId, content) ?? _MockStreamHandle();
  }

  @override
  Future<void> deleteConversation(String id) async {
    deleteCount++;
  }

  @override
  Future<void> renameConversation(String id, String title) async {
    renameCount++;
    lastRenameId = id;
    lastRenameTitle = title;
  }
}

class _MockStreamHandle extends KChatStreamHandle {
  void Function(String)? _tokenCb;
  void Function(KChatMessage)? _completeCb;
  void Function(Object)? _errorCb;
  int abortCount = 0;

  @override
  void onToken(void Function(String) callback) => _tokenCb = callback;
  @override
  void onComplete(void Function(KChatMessage) callback) =>
      _completeCb = callback;
  @override
  void onError(void Function(Object) callback) => _errorCb = callback;
  @override
  void abort() => abortCount++;

  void emitToken(String t) => _tokenCb?.call(t);
  void emitComplete(KChatMessage msg) => _completeCb?.call(msg);
  void emitError(Object err) => _errorCb?.call(err);
}

Widget _wrap(Widget child, {double width = 280, double height = 600}) {
  return MaterialApp(
    home: Scaffold(
      body: SizedBox(width: width, height: height, child: child),
    ),
  );
}

// ============================================================================
// KConversationSidebar tests
// ============================================================================

void main() {
  group('KConversationSidebar — rendering', () {
    testWidgets('shows conversations with date groups', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
        ),
      ));

      expect(find.text('Today'), findsOneWidget);
      expect(find.text('This Week'), findsOneWidget);
      expect(find.text('Earlier'), findsOneWidget);
      expect(find.text('Today chat'), findsOneWidget);
      expect(find.text('Yesterday chat'), findsOneWidget);
      expect(find.text('Old chat'), findsOneWidget);
    });

    testWidgets('shows empty message when no conversations', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: const [],
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
        ),
      ));

      expect(find.text('No conversations yet'), findsOneWidget);
    });

    testWidgets('shows last message preview', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
        ),
      ));

      expect(find.text('Hello there'), findsOneWidget);
      expect(find.text('Previous discussion'), findsOneWidget);
    });

    testWidgets('renders metaBuilder output', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
          metaBuilder: (c) => Text('meta-${c.id}', key: ValueKey('meta-${c.id}')),
        ),
      ));

      expect(find.byKey(const ValueKey('meta-c1')), findsOneWidget);
      expect(find.byKey(const ValueKey('meta-c2')), findsOneWidget);
    });
  });

  group('KConversationSidebar — search', () {
    testWidgets('filters by title', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
        ),
      ));

      await tester.enterText(find.byType(TextField), 'Old');
      await tester.pump();

      expect(find.text('Old chat'), findsOneWidget);
      expect(find.text('Today chat'), findsNothing);
    });

    testWidgets('filters by lastMessage', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
        ),
      ));

      await tester.enterText(find.byType(TextField), 'Previous');
      await tester.pump();

      expect(find.text('Yesterday chat'), findsOneWidget);
      expect(find.text('Today chat'), findsNothing);
    });

    testWidgets('shows no-results message', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
        ),
      ));

      await tester.enterText(find.byType(TextField), 'nonexistent');
      await tester.pump();

      expect(find.text('No matching conversations'), findsOneWidget);
    });
  });

  group('KConversationSidebar — actions', () {
    testWidgets('calls onSelect when conversation tapped', (tester) async {
      String? selected;
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (id) => selected = id,
          onNew: () {},
        ),
      ));

      await tester.tap(find.text('Today chat'));
      expect(selected, 'c1');
    });

    testWidgets('calls onNew when + New tapped', (tester) async {
      var called = false;
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () => called = true,
        ),
      ));

      await tester.tap(find.text('+ New'));
      expect(called, isTrue);
    });
  });

  group('KConversationSidebar — rename', () {
    testWidgets('shows rename input from menu', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
          onRename: (_, __) {},
        ),
      ));

      // Tap the menu button (more_vert icon) for the first conversation
      await tester.tap(find.byIcon(Icons.more_vert).first);
      await tester.pump();

      // Tap Rename
      await tester.tap(find.text('Rename'));
      await tester.pump();

      // Should show 2 TextFields: search + rename
      expect(find.byType(TextField), findsNWidgets(2));
    });

    testWidgets('calls onRename on submit', (tester) async {
      String? renamedId;
      String? newTitle;
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
          onRename: (id, title) {
            renamedId = id;
            newTitle = title;
          },
        ),
      ));

      // Open menu, tap Rename
      await tester.tap(find.byIcon(Icons.more_vert).first);
      await tester.pump();
      await tester.tap(find.text('Rename'));
      await tester.pump();

      // Clear and type new title, then submit
      // The rename TextField is the second one (first is search)
      final renameField = find.byType(TextField).last;
      await tester.enterText(renameField, 'New Title');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pump();

      expect(renamedId, 'c1');
      expect(newTitle, 'New Title');
    });
  });

  group('KConversationSidebar — delete', () {
    testWidgets('shows delete confirmation from menu', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
          onDelete: (_) {},
        ),
      ));

      await tester.tap(find.byIcon(Icons.more_vert).first);
      await tester.pump();
      await tester.tap(find.text('Delete'));
      await tester.pump();

      expect(find.text('Delete?'), findsOneWidget);
      expect(find.text('Yes'), findsOneWidget);
      expect(find.text('No'), findsOneWidget);
    });

    testWidgets('calls onDelete when Yes tapped', (tester) async {
      String? deletedId;
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
          onDelete: (id) => deletedId = id,
        ),
      ));

      await tester.tap(find.byIcon(Icons.more_vert).first);
      await tester.pump();
      await tester.tap(find.text('Delete'));
      await tester.pump();
      await tester.tap(find.text('Yes'));
      await tester.pump();

      expect(deletedId, 'c1');
    });

    testWidgets('cancels delete when No tapped', (tester) async {
      String? deletedId;
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
          onDelete: (id) => deletedId = id,
        ),
      ));

      await tester.tap(find.byIcon(Icons.more_vert).first);
      await tester.pump();
      await tester.tap(find.text('Delete'));
      await tester.pump();
      await tester.tap(find.text('No'));
      await tester.pump();

      expect(deletedId, isNull);
      expect(find.text('Delete?'), findsNothing);
    });
  });

  group('KConversationSidebar — collapsed', () {
    testWidgets('shows icon strip in collapsed mode', (tester) async {
      await tester.pumpWidget(_wrap(
        KConversationSidebar(
          conversations: _conversations(),
          activeId: null,
          onSelect: (_) {},
          onNew: () {},
          collapsed: true,
          onToggleCollapse: () {},
        ),
      ));

      expect(find.byIcon(Icons.menu), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);
      // Should NOT show conversation titles
      expect(find.text('Today chat'), findsNothing);
    });
  });

  // ============================================================================
  // KChatState tests
  // ============================================================================

  group('KChatState', () {
    test('loadConversations populates list', () async {
      final adapter = _MockAdapter();
      final state = KChatState(adapter);

      await state.loadConversations();

      expect(state.conversations.length, 3);
      expect(state.isLoadingConversations, isFalse);
    });

    test('switchConversation loads messages', () async {
      final adapter = _MockAdapter()
        ..onLoadMessages = (id) => [
              KChatMessage(
                id: 'msg-1',
                type: KMessageType.user,
                content: 'Hello',
                timestamp: DateTime.now(),
                sender: KMessageSender.user,
              ),
            ];
      final state = KChatState(adapter);

      await state.switchConversation('c1');

      expect(state.activeConversationId, 'c1');
      expect(state.messages.length, 1);
      expect(state.messages[0].content, 'Hello');
    });

    test('startNewConversation clears state', () async {
      final adapter = _MockAdapter()
        ..onLoadMessages = (_) => [
              KChatMessage(
                id: 'msg-1',
                type: KMessageType.user,
                content: 'Hello',
                timestamp: DateTime.now(),
                sender: KMessageSender.user,
              ),
            ];
      final state = KChatState(adapter);

      await state.switchConversation('c1');
      expect(state.messages.length, 1);

      state.startNewConversation();

      expect(state.activeConversationId, isNull);
      expect(state.messages, isEmpty);
    });

    test('sendMessage adds user message optimistically', () {
      final handle = _MockStreamHandle();
      final adapter = _MockAdapter()
        ..onSendMessage = (_, __) => handle;
      final state = KChatState(adapter);

      state.sendMessage('Test message');

      expect(state.messages.length, 1);
      expect(state.messages[0].content, 'Test message');
      expect(state.messages[0].sender, KMessageSender.user);
      expect(state.isStreaming, isTrue);
    });

    test('stream tokens accumulate in buffer', () {
      final handle = _MockStreamHandle();
      final adapter = _MockAdapter()
        ..onSendMessage = (_, __) => handle;
      final state = KChatState(adapter);

      state.sendMessage('Hello');
      handle.emitToken('Hello ');
      expect(state.streamBuffer, 'Hello ');

      handle.emitToken('world!');
      expect(state.streamBuffer, 'Hello world!');
    });

    test('stream complete adds assistant message', () {
      final handle = _MockStreamHandle();
      final adapter = _MockAdapter()
        ..onSendMessage = (_, __) => handle;
      final state = KChatState(adapter);

      state.sendMessage('Hello');
      handle.emitToken('Response');
      handle.emitComplete(KChatMessage(
        id: 'msg-a1',
        type: KMessageType.assistant,
        content: 'Response text',
        timestamp: DateTime.now(),
        sender: KMessageSender.assistant,
      ));

      expect(state.isStreaming, isFalse);
      expect(state.streamBuffer, '');
      expect(state.messages.length, 2);
      expect(state.messages[1].content, 'Response text');
    });

    test('stream error adds error message', () {
      final handle = _MockStreamHandle();
      final adapter = _MockAdapter()
        ..onSendMessage = (_, __) => handle;
      final state = KChatState(adapter);

      state.sendMessage('Hello');
      handle.emitError(Exception('Connection lost'));

      expect(state.isStreaming, isFalse);
      expect(state.error, isNotNull);
      expect(state.messages.length, 2);
      expect(state.messages[1].type, KMessageType.error);
    });

    test('deleteConversation removes from list', () async {
      final adapter = _MockAdapter();
      final state = KChatState(adapter);

      await state.loadConversations();
      expect(state.conversations.length, 3);

      await state.deleteConversation('c1');

      expect(adapter.deleteCount, 1);
      expect(state.conversations.length, 2);
    });

    test('deleteConversation clears active if deleted', () async {
      final adapter = _MockAdapter();
      final state = KChatState(adapter);

      await state.loadConversations();
      await state.switchConversation('c1');
      expect(state.activeConversationId, 'c1');

      await state.deleteConversation('c1');

      expect(state.activeConversationId, isNull);
      expect(state.messages, isEmpty);
    });

    test('renameConversation updates title in list', () async {
      final adapter = _MockAdapter();
      final state = KChatState(adapter);

      await state.loadConversations();
      await state.renameConversation('c1', 'Renamed');

      expect(adapter.lastRenameId, 'c1');
      expect(adapter.lastRenameTitle, 'Renamed');
      expect(
        state.conversations.firstWhere((c) => c.id == 'c1').title,
        'Renamed',
      );
    });

    test('does not send empty messages', () {
      final adapter = _MockAdapter()
        ..onSendMessage = (_, __) => _MockStreamHandle();
      final state = KChatState(adapter);

      state.sendMessage('   ');
      expect(state.messages, isEmpty);
    });
  });
}
