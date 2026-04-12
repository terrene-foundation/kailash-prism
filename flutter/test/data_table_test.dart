import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

void main() {
  final testData = [
    {'id': 1, 'name': 'Alice', 'age': 30},
    {'id': 2, 'name': 'Bob', 'age': 25},
    {'id': 3, 'name': 'Carol', 'age': 35},
  ];

  final testColumns = [
    const KColumnDef<Map<String, Object?>>(field: 'name', header: 'Name'),
    const KColumnDef<Map<String, Object?>>(field: 'age', header: 'Age'),
  ];

  Widget wrap(Widget child) {
    return MaterialApp(
      home: Scaffold(
        body: SizedBox(width: 1200, child: child),
      ),
    );
  }

  group('KDataTable', () {
    testWidgets('renders all rows', (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(wrap(
        KDataTable<Map<String, Object?>>(
          columns: testColumns,
          data: testData,
          paginationEnabled: false,
          filteringEnabled: false,
        ),
      ));
      await tester.pump();

      expect(find.text('Alice'), findsOneWidget);
      expect(find.text('Bob'), findsOneWidget);
      expect(find.text('Carol'), findsOneWidget);
    });

    testWidgets('renders column headers', (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(wrap(
        KDataTable<Map<String, Object?>>(
          columns: testColumns,
          data: testData,
          paginationEnabled: false,
          filteringEnabled: false,
        ),
      ));
      await tester.pump();

      expect(find.text('Name'), findsOneWidget);
      expect(find.text('Age'), findsOneWidget);
    });

    testWidgets('shows empty state when no data', (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(wrap(
        KDataTable<Map<String, Object?>>(
          columns: testColumns,
          data: const [],
          filteringEnabled: false,
        ),
      ));
      await tester.pump();

      expect(find.text('No data to display'), findsOneWidget);
    });

    testWidgets('shows custom empty message', (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(wrap(
        KDataTable<Map<String, Object?>>(
          columns: testColumns,
          data: const [],
          emptyMessage: 'No users found',
          filteringEnabled: false,
        ),
      ));
      await tester.pump();

      expect(find.text('No users found'), findsOneWidget);
    });

    testWidgets('shows loading indicator', (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(wrap(
        KDataTable<Map<String, Object?>>(
          columns: testColumns,
          data: testData,
          loading: true,
          filteringEnabled: false,
        ),
      ));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows error state', (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(wrap(
        KDataTable<Map<String, Object?>>(
          columns: testColumns,
          data: testData,
          errorMessage: 'Failed to load data',
          filteringEnabled: false,
        ),
      ));
      await tester.pump();

      expect(find.text('Failed to load data'), findsOneWidget);
    });
  });
}
