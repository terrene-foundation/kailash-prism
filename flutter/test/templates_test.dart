import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

void main() {
  const desktopSize = Size(1280, 800);
  const tabletSize = Size(900, 800); // 768 ≤ width < 1024
  const mobileSize = Size(400, 800);

  // Default desktop surface — 1280×800 is above desktop breakpoint (1024).
  // `setSurfaceSize` is the only way to affect KResponsiveBuilder in tests;
  // `tester.view.physicalSize` does not propagate to LayoutBuilder.
  Future<void> pumpAt(WidgetTester tester, Widget child, {Size size = desktopSize}) async {
    await tester.binding.setSurfaceSize(size);
    await tester.pumpWidget(
      MaterialApp(home: Scaffold(body: child)),
    );
  }

  group('KTemplateHeader', () {
    testWidgets('renders title only', (tester) async {
      await pumpAt(tester, const KTemplateHeader(title: 'Users'));
      expect(find.text('Users'), findsOneWidget);
    });

    testWidgets('renders title and subtitle', (tester) async {
      await pumpAt(tester, const KTemplateHeader(title: 'Users', subtitle: 'Manage team'));
      expect(find.text('Users'), findsOneWidget);
      expect(find.text('Manage team'), findsOneWidget);
    });

    testWidgets('renders header actions', (tester) async {
      await pumpAt(
        tester,
        KTemplateHeader(
          title: 'Users',
          actions: [
            KButton(onPressed: () {}, child: const Text('Add')),
          ],
        ),
      );
      expect(find.text('Users'), findsOneWidget);
      expect(find.text('Add'), findsOneWidget);
    });
  });

  group('KDashboardTemplate', () {
    testWidgets('renders header and stats row', (tester) async {
      await pumpAt(
        tester,
        const KDashboardTemplate(
          title: 'Overview',
          subtitle: 'Last 30 days',
          statsRow: [Text('Stat 1'), Text('Stat 2'), Text('Stat 3'), Text('Stat 4')],
        ),
      );
      expect(find.text('Overview'), findsOneWidget);
      expect(find.text('Last 30 days'), findsOneWidget);
      expect(find.text('Stat 1'), findsOneWidget);
      expect(find.text('Stat 4'), findsOneWidget);
    });

    testWidgets('renders primary chart + secondary content on desktop', (tester) async {
      await pumpAt(
        tester,
        const KDashboardTemplate(
          title: 'Overview',
          primaryChart: Text('Chart'),
          secondaryContent: Text('Activity'),
        ),
      );
      expect(find.text('Chart'), findsOneWidget);
      expect(find.text('Activity'), findsOneWidget);
    });
  });

  group('KListTemplate', () {
    testWidgets('renders content and optional bars', (tester) async {
      await pumpAt(
        tester,
        const KListTemplate(
          title: 'Contacts',
          filterBar: Text('Filter bar'),
          content: Text('Data table'),
          footer: Text('Pagination'),
        ),
      );
      expect(find.text('Contacts'), findsOneWidget);
      expect(find.text('Filter bar'), findsOneWidget);
      expect(find.text('Data table'), findsOneWidget);
      expect(find.text('Pagination'), findsOneWidget);
    });
  });

  group('KDetailTemplate', () {
    testWidgets('renders summary + content + sidebar + related', (tester) async {
      await pumpAt(
        tester,
        const KDetailTemplate(
          title: 'Contact #123',
          summary: Text('Summary card'),
          content: Text('Tabs'),
          sidebar: Text('Metadata'),
          related: Text('Related'),
        ),
      );
      expect(find.text('Contact #123'), findsOneWidget);
      expect(find.text('Summary card'), findsOneWidget);
      expect(find.text('Tabs'), findsOneWidget);
      expect(find.text('Metadata'), findsOneWidget);
      expect(find.text('Related'), findsOneWidget);
    });
  });

  group('KFormTemplate', () {
    testWidgets('renders content and sidebar', (tester) async {
      await pumpAt(
        tester,
        const KFormTemplate(
          title: 'New contact',
          content: Text('Form fields'),
          sidebar: Text('Help text'),
        ),
      );
      expect(find.text('New contact'), findsOneWidget);
      expect(find.text('Form fields'), findsOneWidget);
      expect(find.text('Help text'), findsOneWidget);
    });
  });

  group('KSettingsTemplate', () {
    testWidgets('renders nav and content', (tester) async {
      await pumpAt(
        tester,
        const KSettingsTemplate(
          title: 'Settings',
          settingsNav: Text('Nav list'),
          content: Text('Profile settings'),
        ),
      );
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Nav list'), findsOneWidget);
      expect(find.text('Profile settings'), findsOneWidget);
    });
  });

  group('KAuthTemplate', () {
    testWidgets('renders form card without brand panel on mobile', (tester) async {
      await pumpAt(
        tester,
        const KAuthTemplate(content: Text('Login form')),
        size: mobileSize,
      );
      expect(find.text('Login form'), findsOneWidget);
    });

    testWidgets('renders brand panel + form card on desktop', (tester) async {
      await pumpAt(
        tester,
        const KAuthTemplate(
          content: Text('Login form'),
          brandPanel: Text('Welcome to Prism'),
        ),
      );
      expect(find.text('Login form'), findsOneWidget);
      expect(find.text('Welcome to Prism'), findsOneWidget);
    });
  });

  group('KConversationTemplate', () {
    testWidgets('renders content + conversation list + detail panel', (tester) async {
      await pumpAt(
        tester,
        const KConversationTemplate(
          conversationList: Text('Chat list'),
          content: Text('Chat content'),
          detailPanel: Text('Citation panel'),
        ),
      );
      expect(find.text('Chat list'), findsOneWidget);
      expect(find.text('Chat content'), findsOneWidget);
      expect(find.text('Citation panel'), findsOneWidget);
    });

    testWidgets('hides list and detail panel on mobile', (tester) async {
      await pumpAt(
        tester,
        const KConversationTemplate(
          conversationList: Text('Chat list'),
          content: Text('Chat content'),
          detailPanel: Text('Citation panel'),
        ),
        size: mobileSize,
      );
      expect(find.text('Chat list'), findsNothing);
      expect(find.text('Chat content'), findsOneWidget);
      expect(find.text('Citation panel'), findsNothing);
    });
  });

  group('KWiredConversationTemplate', () {
    testWidgets('renders sidebar and chat engine from adapter', (tester) async {
      final adapter = _TestChatAdapter();
      await pumpAt(tester, KWiredConversationTemplate(adapter: adapter));
      await tester.pumpAndSettle();

      // Sidebar shows conversation titles from adapter
      expect(find.text('First chat'), findsOneWidget);
      expect(find.text('Second chat'), findsOneWidget);

      // Chat engine shows empty state (no conversation selected)
      expect(find.text('Start a conversation'), findsOneWidget);
    });

    testWidgets('renders detail panel alongside wired content', (tester) async {
      final adapter = _TestChatAdapter();
      await pumpAt(
        tester,
        KWiredConversationTemplate(
          adapter: adapter,
          detailPanel: const Text('citation panel'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('citation panel'), findsOneWidget);
    });

    testWidgets('accepts metaBuilder for domain badges', (tester) async {
      final adapter = _TestChatAdapter();
      await pumpAt(
        tester,
        KWiredConversationTemplate(
          adapter: adapter,
          metaBuilder: (conv) => Text('badge-${conv.id}'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('badge-c1'), findsOneWidget);
      expect(find.text('badge-c2'), findsOneWidget);
    });

    testWidgets('accepts contentBuilder override', (tester) async {
      final adapter = _TestChatAdapter();
      await pumpAt(
        tester,
        KWiredConversationTemplate(
          adapter: adapter,
          contentBuilder: (state) =>
              Text('custom content: ${state.conversations.length} convs'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('custom content: 2 convs'), findsOneWidget);
    });

    testWidgets('accepts sidebarBuilder override', (tester) async {
      final adapter = _TestChatAdapter();
      await pumpAt(
        tester,
        KWiredConversationTemplate(
          adapter: adapter,
          sidebarBuilder: (state) =>
              Text('custom sidebar: ${state.conversations.length}'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('custom sidebar: 2'), findsOneWidget);
    });

    testWidgets('hides sidebar on mobile', (tester) async {
      final adapter = _TestChatAdapter();
      await pumpAt(
        tester,
        KWiredConversationTemplate(adapter: adapter),
        size: mobileSize,
      );
      await tester.pumpAndSettle();
      // Sidebar conversations should not be visible on mobile
      expect(find.text('First chat'), findsNothing);
      // Chat engine still visible
      expect(find.text('Start a conversation'), findsOneWidget);
    });
  });

  group('KSplitTemplate', () {
    testWidgets('renders both panels on desktop', (tester) async {
      await pumpAt(
        tester,
        const KSplitTemplate(
          title: 'Compare',
          primary: Text('Left panel'),
          secondary: Text('Right panel'),
        ),
      );
      expect(find.text('Left panel'), findsOneWidget);
      expect(find.text('Right panel'), findsOneWidget);
    });
  });

  group('KWizardTemplate', () {
    testWidgets('renders centered content', (tester) async {
      await pumpAt(
        tester,
        const KWizardTemplate(
          title: 'Onboarding',
          content: Text('Step 1 form'),
        ),
      );
      expect(find.text('Onboarding'), findsOneWidget);
      expect(find.text('Step 1 form'), findsOneWidget);
    });
  });

  group('KKanbanTemplate', () {
    testWidgets('renders columns', (tester) async {
      await pumpAt(
        tester,
        const KKanbanTemplate(
          title: 'Tasks',
          columns: [
            KKanbanColumn(id: 'todo', title: 'To do', count: 3, child: Text('Todo items')),
            KKanbanColumn(id: 'doing', title: 'In progress', count: 1, child: Text('Doing items')),
            KKanbanColumn(id: 'done', title: 'Done', count: 5, child: Text('Done items')),
          ],
        ),
      );
      expect(find.text('To do'), findsOneWidget);
      expect(find.text('In progress'), findsOneWidget);
      expect(find.text('Done'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
      expect(find.text('5'), findsOneWidget);
    });
  });

  group('KCalendarTemplate', () {
    testWidgets('renders view controls, content, event detail on desktop', (tester) async {
      await pumpAt(
        tester,
        const KCalendarTemplate(
          title: 'Schedule',
          viewControls: [Text('Day'), Text('Week'), Text('Month')],
          content: Text('Calendar grid'),
          eventDetail: Text('Selected event'),
        ),
      );
      expect(find.text('Schedule'), findsOneWidget);
      expect(find.text('Day'), findsOneWidget);
      expect(find.text('Week'), findsOneWidget);
      expect(find.text('Month'), findsOneWidget);
      expect(find.text('Calendar grid'), findsOneWidget);
      expect(find.text('Selected event'), findsOneWidget);
    });
  });

  // Tablet breakpoint (768 ≤ width < 1024) — stack-and-split decisions
  // change here for every template that has a sidebar. Smoke-test the
  // templates where the decision is observably different from desktop.
  group('Tablet breakpoint', () {
    testWidgets('KConversationTemplate hides detail panel on tablet', (tester) async {
      await pumpAt(
        tester,
        const KConversationTemplate(
          conversationList: Text('Chat list'),
          content: Text('Chat content'),
          detailPanel: Text('Citation panel'),
        ),
        size: tabletSize,
      );
      // List stays visible on tablet; detail panel hides.
      expect(find.text('Chat list'), findsOneWidget);
      expect(find.text('Chat content'), findsOneWidget);
      expect(find.text('Citation panel'), findsNothing);
    });

    testWidgets('KDashboardTemplate stacks primary/secondary on tablet', (tester) async {
      await pumpAt(
        tester,
        const KDashboardTemplate(
          title: 'Overview',
          primaryChart: Text('Chart'),
          secondaryContent: Text('Activity'),
        ),
        size: tabletSize,
      );
      // Both render but layout collapses to stack — both visible.
      expect(find.text('Chart'), findsOneWidget);
      expect(find.text('Activity'), findsOneWidget);
    });

    testWidgets('KDetailTemplate stacks content+sidebar on tablet', (tester) async {
      await pumpAt(
        tester,
        const KDetailTemplate(
          title: 'Contact',
          content: Text('Tabs'),
          sidebar: Text('Metadata'),
        ),
        size: tabletSize,
      );
      expect(find.text('Tabs'), findsOneWidget);
      expect(find.text('Metadata'), findsOneWidget);
    });

    testWidgets('KCalendarTemplate stacks event detail on tablet', (tester) async {
      await pumpAt(
        tester,
        const KCalendarTemplate(
          title: 'Schedule',
          content: Text('Calendar grid'),
          eventDetail: Text('Event detail'),
        ),
        size: tabletSize,
      );
      expect(find.text('Calendar grid'), findsOneWidget);
      expect(find.text('Event detail'), findsOneWidget);
    });

    testWidgets('KFormTemplate stacks sidebar on tablet', (tester) async {
      await pumpAt(
        tester,
        const KFormTemplate(
          title: 'New item',
          content: Text('Form'),
          sidebar: Text('Help'),
        ),
        size: tabletSize,
      );
      expect(find.text('Form'), findsOneWidget);
      expect(find.text('Help'), findsOneWidget);
    });
  });
}

/// Test adapter returning predictable conversation and message data.
class _TestChatAdapter extends KChatAdapter {
  @override
  Future<List<KConversationSummary>> listConversations() async => [
        KConversationSummary(
          id: 'c1',
          title: 'First chat',
          timestamp: DateTime.now(),
          messageCount: 2,
        ),
        KConversationSummary(
          id: 'c2',
          title: 'Second chat',
          timestamp: DateTime.now().subtract(const Duration(hours: 1)),
          messageCount: 5,
        ),
      ];

  @override
  Future<List<KChatMessage>> loadMessages(String conversationId) async => [
        KChatMessage(
          id: 'm1',
          type: KMessageType.user,
          content: 'Hello',
          timestamp: DateTime.now(),
          sender: KMessageSender.user,
        ),
        KChatMessage(
          id: 'm2',
          type: KMessageType.assistant,
          content: 'Hi there!',
          timestamp: DateTime.now(),
          sender: KMessageSender.assistant,
        ),
      ];

  @override
  KChatStreamHandle sendMessage(String? conversationId, String content) =>
      _NoopStreamHandle();

  @override
  Future<void> deleteConversation(String id) async {}

  @override
  Future<void> renameConversation(String id, String title) async {}
}

class _NoopStreamHandle extends KChatStreamHandle {
  @override
  void onToken(void Function(String token) callback) {}
  @override
  void onComplete(void Function(KChatMessage message) callback) {}
  @override
  void onError(void Function(Object error) callback) {}
  @override
  void abort() {}
}
