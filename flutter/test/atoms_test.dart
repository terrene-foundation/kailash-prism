import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

void main() {
  Widget wrap(Widget child) {
    return MaterialApp(
      home: Scaffold(body: Center(child: child)),
    );
  }

  group('KButton', () {
    testWidgets('renders label text', (tester) async {
      await tester.pumpWidget(wrap(
        KButton(onPressed: () {}, child: const Text('Save')),
      ));
      expect(find.text('Save'), findsOneWidget);
    });

    testWidgets('fires onPressed when tapped', (tester) async {
      var tapped = false;
      await tester.pumpWidget(wrap(
        KButton(onPressed: () => tapped = true, child: const Text('Save')),
      ));
      await tester.tap(find.text('Save'));
      expect(tapped, isTrue);
    });

    testWidgets('does not fire onPressed when disabled', (tester) async {
      var tapped = false;
      await tester.pumpWidget(wrap(
        KButton(
          onPressed: () => tapped = true,
          disabled: true,
          child: const Text('Save'),
        ),
      ));
      await tester.tap(find.text('Save'));
      expect(tapped, isFalse);
    });

    testWidgets('shows spinner when loading', (tester) async {
      await tester.pumpWidget(wrap(
        KButton(
          onPressed: () {},
          loading: true,
          child: const Text('Save'),
        ),
      ));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('loading state blocks taps', (tester) async {
      var tapped = false;
      await tester.pumpWidget(wrap(
        KButton(
          onPressed: () => tapped = true,
          loading: true,
          child: const Text('Save'),
        ),
      ));
      await tester.tap(find.text('Save'));
      expect(tapped, isFalse);
    });

    testWidgets('renders all variants without errors', (tester) async {
      for (final variant in KButtonVariant.values) {
        await tester.pumpWidget(wrap(
          KButton(
            onPressed: () {},
            variant: variant,
            child: const Text('Go'),
          ),
        ));
        expect(find.text('Go'), findsOneWidget);
      }
    });

    testWidgets('renders all sizes without errors', (tester) async {
      for (final size in KButtonSize.values) {
        await tester.pumpWidget(wrap(
          KButton(
            onPressed: () {},
            size: size,
            child: const Text('Go'),
          ),
        ));
        expect(find.text('Go'), findsOneWidget);
      }
    });
  });

  group('KBadge', () {
    testWidgets('renders text child', (tester) async {
      await tester.pumpWidget(wrap(
        const KBadge(child: Text('NEW')),
      ));
      expect(find.text('NEW'), findsOneWidget);
    });

    testWidgets('dot mode renders without child', (tester) async {
      await tester.pumpWidget(wrap(
        const KBadge(dot: true),
      ));
      expect(find.byType(KBadge), findsOneWidget);
    });

    testWidgets('all variants render', (tester) async {
      for (final variant in KBadgeVariant.values) {
        await tester.pumpWidget(wrap(
          KBadge(variant: variant, child: const Text('x')),
        ));
        expect(find.text('x'), findsOneWidget);
      }
    });
  });

  group('KAvatar', () {
    test('initialsFor extracts first letter of single name', () {
      expect(KAvatar.initialsFor('Alice'), 'A');
    });

    test('initialsFor extracts first + last initials', () {
      expect(KAvatar.initialsFor('Alice Wonderland'), 'AW');
    });

    test('initialsFor returns ? for empty', () {
      expect(KAvatar.initialsFor(''), '?');
    });

    test('hashColor is deterministic', () {
      expect(KAvatar.hashColor('Alice'), KAvatar.hashColor('Alice'));
    });

    test('hashColor differs for different names', () {
      expect(
        KAvatar.hashColor('Alice') == KAvatar.hashColor('Bob'),
        isFalse,
      );
    });

    testWidgets('renders initials for name-only avatar', (tester) async {
      await tester.pumpWidget(wrap(
        const KAvatar(name: 'Alice Wonderland'),
      ));
      expect(find.text('AW'), findsOneWidget);
    });

    testWidgets('all sizes render', (tester) async {
      for (final size in KAvatarSize.values) {
        await tester.pumpWidget(wrap(
          KAvatar(name: 'Alice', size: size),
        ));
        expect(find.text('A'), findsOneWidget);
      }
    });
  });

  group('KSpinner', () {
    testWidgets('renders CircularProgressIndicator', (tester) async {
      await tester.pumpWidget(wrap(const KSpinner()));
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('all sizes render', (tester) async {
      for (final size in KSpinnerSize.values) {
        await tester.pumpWidget(wrap(KSpinner(size: size)));
        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      }
    });
  });
}
