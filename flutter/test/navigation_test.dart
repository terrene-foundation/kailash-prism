import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

void main() {
  const testRoutes = [
    KRouteNode(path: '/dashboard', label: 'Dashboard', icon: Icons.dashboard),
    KRouteNode(
      path: '/contacts',
      label: 'Contacts',
      icon: Icons.people,
      badgeCount: 42,
    ),
    KRouteNode(
      path: '/settings',
      label: 'Settings',
      icon: Icons.settings,
      bottomAligned: true,
    ),
  ];

  group('KRouteMatcher', () {
    test('matches exact path', () {
      final match = KRouteMatcher.match(testRoutes, '/contacts', prefix: false);
      expect(match?.path, '/contacts');
    });

    test('matches prefix path', () {
      final match = KRouteMatcher.match(testRoutes, '/contacts/123');
      expect(match?.path, '/contacts');
    });

    test('returns null for unmatched path', () {
      final match = KRouteMatcher.match(testRoutes, '/nonexistent');
      expect(match, isNull);
    });

    test('builds breadcrumbs from path', () {
      final crumbs = KRouteMatcher.breadcrumbs(testRoutes, '/contacts');
      expect(crumbs.length, 1);
      expect(crumbs[0].path, '/contacts');
    });
  });

  group('KAppShell', () {
    testWidgets('renders sidebar with routes on desktop', (tester) async {
      await tester.binding.setSurfaceSize(const Size(1400, 900));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        const MaterialApp(
          home: KAppShell(
            routes: testRoutes,
            currentPath: '/dashboard',
            child: Text('Content'),
          ),
        ),
      );
      await tester.pump();

      // "Dashboard" appears in both sidebar nav item and breadcrumb
      expect(find.text('Dashboard'), findsWidgets);
      expect(find.text('Contacts'), findsOneWidget);
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Content'), findsOneWidget);
    });

    testWidgets('shows badge count', (tester) async {
      await tester.binding.setSurfaceSize(const Size(1400, 900));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        const MaterialApp(
          home: KAppShell(
            routes: testRoutes,
            child: Text('X'),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('42'), findsOneWidget);
    });

    testWidgets('on mobile uses drawer layout', (tester) async {
      await tester.binding.setSurfaceSize(const Size(375, 800));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpWidget(
        const MaterialApp(
          home: KAppShell(
            routes: testRoutes,
            currentPath: '/dashboard',
            child: Text('Content'),
          ),
        ),
      );
      await tester.pump();

      // Mobile has AppBar
      expect(find.byType(AppBar), findsOneWidget);
      expect(find.text('Content'), findsOneWidget);
    });
  });
}
