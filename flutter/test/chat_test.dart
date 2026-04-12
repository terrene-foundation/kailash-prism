import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

void main() {
  Widget wrap(Widget child) {
    return MaterialApp(
      home: Scaffold(body: SizedBox(width: 800, height: 600, child: child)),
    );
  }

  KChatMessage userMsg(String id, String content) => KChatMessage(
        id: id,
        type: KMessageType.user,
        content: content,
        timestamp: DateTime(2026, 4, 12, 10, 30),
        sender: KMessageSender.user,
      );

  KChatMessage assistantMsg(String id, String content, {List<KCitation>? citations}) =>
      KChatMessage(
        id: id,
        type: KMessageType.assistant,
        content: content,
        timestamp: DateTime(2026, 4, 12, 10, 31),
        sender: KMessageSender.assistant,
        citations: citations,
      );

  group('KChatEngine — empty state', () {
    testWidgets('renders empty-state copy when no messages', (tester) async {
      await tester.pumpWidget(wrap(
        const KChatEngine(messages: []),
      ));

      expect(find.text('Start a conversation'), findsOneWidget);
      expect(
        find.text('Type a message below or choose a suggestion to get started.'),
        findsOneWidget,
      );
    });

    testWidgets('shows suggestion chips in empty state', (tester) async {
      await tester.pumpWidget(wrap(
        const KChatEngine(
          messages: [],
          suggestions: [
            KSuggestionChip(label: 'Summarize', value: 'Summarize this'),
            KSuggestionChip(label: 'Draft email', value: 'Draft an email'),
          ],
        ),
      ));

      expect(find.text('Summarize'), findsOneWidget);
      expect(find.text('Draft email'), findsOneWidget);
    });
  });

  group('KChatEngine — messages', () {
    testWidgets('renders user and assistant messages', (tester) async {
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: [
            userMsg('1', 'Hello'),
            assistantMsg('2', 'Hi there'),
          ],
        ),
      ));
      await tester.pump();

      expect(find.text('Hello'), findsOneWidget);
      expect(find.text('Hi there'), findsOneWidget);
    });

    testWidgets('renders system message centered and muted', (tester) async {
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: [
            KChatMessage(
              id: 's1',
              type: KMessageType.system,
              content: 'Session started',
              timestamp: DateTime(2026, 4, 12),
              sender: KMessageSender.system,
            ),
          ],
        ),
      ));
      await tester.pump();

      expect(find.text('Session started'), findsOneWidget);
    });

    testWidgets('renders error message with retry button', (tester) async {
      String? retriedId;
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: [
            KChatMessage(
              id: 'e1',
              type: KMessageType.error,
              content: 'Connection lost',
              timestamp: DateTime(2026, 4, 12),
              sender: KMessageSender.assistant,
            ),
          ],
          onRetry: (id) => retriedId = id,
        ),
      ));
      await tester.pump();

      expect(find.text('Error'), findsOneWidget);
      expect(find.text('Connection lost'), findsOneWidget);
      await tester.tap(find.text('Retry'));
      expect(retriedId, 'e1');
    });

    testWidgets('streaming buffer renders as in-progress bubble', (tester) async {
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: [userMsg('1', 'Ask')],
          isStreaming: true,
          streamBuffer: 'Partial response',
        ),
      ));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Partial response'), findsOneWidget);
    });
  });

  group('KChatEngine — input', () {
    Finder sendButton() => find.ancestor(
          of: find.byIcon(Icons.arrow_upward),
          matching: find.byType(InkWell),
        );

    testWidgets('send button disabled when input is empty', (tester) async {
      String? sent;
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: const [],
          onSend: (e) => sent = e.content,
        ),
      ));
      await tester.pump();

      // Tapping send with empty text should not fire
      await tester.tap(sendButton());
      await tester.pump();
      expect(sent, isNull);
    });

    testWidgets('send button fires onSend when input has text', (tester) async {
      String? sent;
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: const [],
          onSend: (e) => sent = e.content,
        ),
      ));
      await tester.pump();

      await tester.enterText(find.byType(TextField), 'Hello there');
      await tester.pump();
      await tester.tap(sendButton());
      await tester.pump();

      expect(sent, 'Hello there');
    });

    testWidgets('input is disabled while streaming', (tester) async {
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: [userMsg('1', 'Hi')],
          isStreaming: true,
          streamBuffer: 'thinking',
          onSend: (_) {},
        ),
      ));
      await tester.pump();

      final TextField tf = tester.widget(find.byType(TextField));
      expect(tf.enabled, isFalse);
    });
  });

  group('KChatEngine — citations', () {
    testWidgets('assistant message shows collapsed citation count', (tester) async {
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: [
            assistantMsg('a1', 'Answer', citations: const [
              KCitation(index: 1, source: 'Doc A', excerpt: 'relevant excerpt'),
              KCitation(
                  index: 2, source: 'Doc B', excerpt: 'another excerpt', confidence: 0.9),
            ]),
          ],
        ),
      ));
      await tester.pump();

      expect(find.text('2 sources'), findsOneWidget);
      // Excerpt should NOT be visible until expanded
      expect(find.text('relevant excerpt'), findsNothing);
    });

    testWidgets('tapping citations toggle expands the list', (tester) async {
      await tester.pumpWidget(wrap(
        KChatEngine(
          messages: [
            assistantMsg('a1', 'Answer', citations: const [
              KCitation(index: 1, source: 'Doc A', excerpt: 'relevant excerpt'),
            ]),
          ],
        ),
      ));
      await tester.pump();

      await tester.tap(find.text('1 source'));
      await tester.pump();

      expect(find.text('relevant excerpt'), findsOneWidget);
    });
  });

  group('KStreamOfThought', () {
    testWidgets('renders nothing when steps are empty', (tester) async {
      await tester.pumpWidget(wrap(
        const KStreamOfThought(steps: []),
      ));
      // Nothing user-visible
      expect(find.byType(Row), findsNothing);
    });

    testWidgets('renders all steps with status markers', (tester) async {
      await tester.pumpWidget(wrap(
        const KStreamOfThought(steps: [
          KToolCallStep(
            id: 's1',
            name: 'search',
            status: KToolCallStatus.done,
            summary: 'Searching knowledge base',
            durationMs: 1200,
          ),
          KToolCallStep(
            id: 's2',
            name: 'summarize',
            status: KToolCallStatus.running,
            summary: 'Analyzing documents',
          ),
          KToolCallStep(
            id: 's3',
            name: 'generate',
            status: KToolCallStatus.queued,
            summary: 'Generating summary',
          ),
        ]),
      ));

      expect(find.text('Searching knowledge base'), findsOneWidget);
      expect(find.text('Analyzing documents'), findsOneWidget);
      expect(find.text('Generating summary'), findsOneWidget);
      expect(find.text('1.2s'), findsOneWidget);
      expect(find.text('...'), findsOneWidget);
    });
  });

  group('KActionPlan', () {
    testWidgets('shows "0/N reviewed" header initially', (tester) async {
      await tester.pumpWidget(wrap(
        KActionPlan(
          steps: const [
            KActionPlanStep(index: 0, description: 'Step one'),
            KActionPlanStep(index: 1, description: 'Step two'),
          ],
          onResponse: (_) {},
        ),
      ));

      expect(find.text('Action Plan (0/2 reviewed)'), findsOneWidget);
      expect(find.text('Step one'), findsOneWidget);
      expect(find.text('Approve'), findsNWidgets(2));
    });

    testWidgets('tapping approve fires onResponse with approve action', (tester) async {
      KActionPlanResponse? response;
      await tester.pumpWidget(wrap(
        KActionPlan(
          steps: const [
            KActionPlanStep(index: 0, description: 'Step one'),
          ],
          onResponse: (r) => response = r,
        ),
      ));

      await tester.tap(find.text('Approve'));
      await tester.pump();

      expect(response, isNotNull);
      expect(response!.action, KActionPlanAction.approve);
      expect(response!.stepIndex, 0);
    });

    testWidgets('all-resolved state shows confirmation', (tester) async {
      await tester.pumpWidget(wrap(
        KActionPlan(
          steps: const [
            KActionPlanStep(
              index: 0,
              description: 'Step one',
              status: KActionPlanStepStatus.approved,
            ),
          ],
          onResponse: (_) {},
        ),
      ));

      expect(find.text('All steps reviewed'), findsOneWidget);
      expect(find.text('Action Plan (1/1 reviewed)'), findsOneWidget);
    });
  });
}
