import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

void main() {
  group('KBreakpoints', () {
    test('resolves mobile for small widths', () {
      expect(KBreakpoints.resolve(375), KBreakpoint.mobile);
      expect(KBreakpoints.resolve(0), KBreakpoint.mobile);
    });

    test('resolves tablet for medium widths', () {
      expect(KBreakpoints.resolve(768), KBreakpoint.tablet);
      expect(KBreakpoints.resolve(1023), KBreakpoint.tablet);
    });

    test('resolves desktop for large widths', () {
      expect(KBreakpoints.resolve(1024), KBreakpoint.desktop);
      expect(KBreakpoints.resolve(1439), KBreakpoint.desktop);
    });

    test('resolves wide for extra-large widths', () {
      expect(KBreakpoints.resolve(1440), KBreakpoint.wide);
      expect(KBreakpoints.resolve(1920), KBreakpoint.wide);
    });
  });

  group('KResponsiveValue', () {
    test('resolves mobile-first cascade', () {
      const value = KResponsiveValue<int>(mobile: 1, desktop: 3);
      expect(value.resolve(KBreakpoint.mobile, fallback: 0), 1);
      expect(value.resolve(KBreakpoint.tablet, fallback: 0), 1); // inherits mobile
      expect(value.resolve(KBreakpoint.desktop, fallback: 0), 3);
      expect(value.resolve(KBreakpoint.wide, fallback: 0), 3); // inherits desktop
    });

    test('uses fallback when no value set', () {
      const value = KResponsiveValue<int>();
      expect(value.resolve(KBreakpoint.mobile, fallback: 42), 42);
    });
  });

  group('KStack', () {
    testWidgets('renders children vertically', (tester) async {
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.ltr,
          child: KStack.vertical(
            children: [Text('A'), Text('B'), Text('C')],
          ),
        ),
      );
      expect(find.text('A'), findsOneWidget);
      expect(find.text('B'), findsOneWidget);
      expect(find.text('C'), findsOneWidget);
    });

    testWidgets('renders children horizontally', (tester) async {
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.ltr,
          child: KStack.horizontal(
            children: [Text('X'), Text('Y')],
          ),
        ),
      );
      expect(find.text('X'), findsOneWidget);
      expect(find.text('Y'), findsOneWidget);
    });
  });

  group('KGrid', () {
    testWidgets('renders children in grid', (tester) async {
      await tester.pumpWidget(
        const Directionality(
          textDirection: TextDirection.ltr,
          child: SizedBox(
            width: 1200,
            child: KGrid(
              defaultColumns: 3,
              gap: 16,
              children: [Text('1'), Text('2'), Text('3')],
            ),
          ),
        ),
      );
      expect(find.text('1'), findsOneWidget);
      expect(find.text('2'), findsOneWidget);
      expect(find.text('3'), findsOneWidget);
    });
  });
}
