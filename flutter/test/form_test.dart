import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

void main() {
  Widget wrap(Widget child) {
    return MaterialApp(
      home: Scaffold(body: child),
    );
  }

  group('KCondition', () {
    test('evaluates equals', () {
      const condition = KCondition(
        field: 'status',
        operator: KConditionOperator.equals,
        value: 'active',
      );
      expect(condition.evaluate({'status': 'active'}), isTrue);
      expect(condition.evaluate({'status': 'inactive'}), isFalse);
    });

    test('evaluates isNotEmpty', () {
      const condition = KCondition(
        field: 'name',
        operator: KConditionOperator.isNotEmpty,
      );
      expect(condition.evaluate({'name': 'Alice'}), isTrue);
      expect(condition.evaluate({'name': ''}), isFalse);
      expect(condition.evaluate({'name': null}), isFalse);
    });
  });

  group('KForm', () {
    testWidgets('renders fields', (tester) async {
      await tester.pumpWidget(wrap(
        KForm(
          fields: const [
            KFieldDef(name: 'name', type: KFieldType.text, label: 'Name', required: true),
            KFieldDef(name: 'email', type: KFieldType.email, label: 'Email'),
          ],
          onSubmit: (values) async {},
        ),
      ));
      await tester.pump();

      expect(find.text('Name'), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
    });

    testWidgets('shows required indicator', (tester) async {
      await tester.pumpWidget(wrap(
        KForm(
          fields: const [
            KFieldDef(name: 'name', type: KFieldType.text, label: 'Name', required: true),
          ],
          onSubmit: (values) async {},
        ),
      ));
      await tester.pump();

      // Required indicator "*" rendered as Text next to label
      expect(find.text(' *'), findsOneWidget);
    });

    testWidgets('validates required field on submit', (tester) async {
      Map<String, Object?>? submittedValues;
      await tester.pumpWidget(wrap(
        KForm(
          fields: const [
            KFieldDef(name: 'name', type: KFieldType.text, label: 'Name', required: true),
          ],
          onSubmit: (values) async {
            submittedValues = values;
          },
        ),
      ));
      await tester.pump();

      await tester.tap(find.text('Submit'));
      await tester.pump();

      expect(submittedValues, isNull); // Submission blocked by validation
      // Error shown in both our label and the TextFormField's errorText
      expect(find.text('Name is required'), findsWidgets);
    });

    testWidgets('submits when fields are valid', (tester) async {
      Map<String, Object?>? submittedValues;
      await tester.pumpWidget(wrap(
        KForm(
          fields: const [
            KFieldDef(name: 'name', type: KFieldType.text, label: 'Name', required: true),
          ],
          onSubmit: (values) async {
            submittedValues = values;
          },
        ),
      ));
      await tester.pump();

      await tester.enterText(find.byType(TextFormField), 'Alice');
      await tester.pump();
      await tester.tap(find.text('Submit'));
      await tester.pumpAndSettle();

      expect(submittedValues, isNotNull);
      expect(submittedValues!['name'], 'Alice');
    });

    testWidgets('renders dropdown field', (tester) async {
      await tester.pumpWidget(wrap(
        KForm(
          fields: const [
            KFieldDef(
              name: 'role',
              type: KFieldType.dropdown,
              label: 'Role',
              options: [
                KOption(label: 'Admin', value: 'admin'),
                KOption(label: 'User', value: 'user'),
              ],
            ),
          ],
          onSubmit: (values) async {},
        ),
      ));
      await tester.pump();

      expect(find.text('Role'), findsOneWidget);
      expect(find.byWidgetPredicate((w) => w.runtimeType.toString().startsWith('DropdownButtonFormField')), findsOneWidget);
    });

    testWidgets('renders checkbox field', (tester) async {
      await tester.pumpWidget(wrap(
        KForm(
          fields: const [
            KFieldDef(name: 'agree', type: KFieldType.checkbox, label: 'Agree to terms'),
          ],
          onSubmit: (values) async {},
        ),
      ));
      await tester.pump();

      expect(find.byType(Checkbox), findsOneWidget);
    });

    testWidgets('renders toggle field', (tester) async {
      await tester.pumpWidget(wrap(
        KForm(
          fields: const [
            KFieldDef(name: 'enabled', type: KFieldType.toggle, label: 'Enabled'),
          ],
          onSubmit: (values) async {},
        ),
      ));
      await tester.pump();

      expect(find.byType(Switch), findsOneWidget);
    });

    testWidgets('conditional visibility hides field when condition fails', (tester) async {
      await tester.pumpWidget(wrap(
        KForm(
          fields: const [
            KFieldDef(name: 'hasReferral', type: KFieldType.toggle, label: 'Has Referral'),
            KFieldDef(
              name: 'referralSource',
              type: KFieldType.text,
              label: 'Referral Source',
              visible: KCondition(
                field: 'hasReferral',
                operator: KConditionOperator.equals,
                value: true,
              ),
            ),
          ],
          onSubmit: (values) async {},
        ),
      ));
      await tester.pump();

      // Initially hasReferral=false, so referralSource is hidden
      expect(find.text('Has Referral'), findsOneWidget);
      expect(find.text('Referral Source'), findsNothing);
    });
  });
}
