import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kailash_prism/kailash_prism.dart';

void main() {
  group('PrismTheme', () {
    test('light theme uses Material 3', () {
      final theme = PrismTheme.light();
      expect(theme.useMaterial3, isTrue);
      expect(theme.brightness, Brightness.light);
    });

    test('dark theme uses Material 3', () {
      final theme = PrismTheme.dark();
      expect(theme.useMaterial3, isTrue);
      expect(theme.brightness, Brightness.dark);
    });

    test('light theme has navy primary color', () {
      final theme = PrismTheme.light();
      expect(theme.colorScheme.primary, PrismColors.interactivePrimary);
    });

    test('dark theme has blue primary color', () {
      final theme = PrismTheme.dark();
      expect(theme.colorScheme.primary, PrismColors.darkInteractivePrimary);
    });

    test('light theme has body text style at 14px', () {
      final theme = PrismTheme.light();
      expect(theme.textTheme.bodyMedium?.fontSize, 14);
      expect(theme.textTheme.bodyMedium?.fontWeight, FontWeight.w400);
    });

    test('light theme has proper text theme sizes', () {
      final theme = PrismTheme.light();
      expect(theme.textTheme.headlineLarge?.fontSize, 32);
      expect(theme.textTheme.headlineMedium?.fontSize, 24);
      expect(theme.textTheme.bodyMedium?.fontSize, 14);
    });

    test('light theme has card theme with border', () {
      final theme = PrismTheme.light();
      expect(theme.cardTheme.elevation, 0);
    });

    test('light theme has input decoration with border radius', () {
      final theme = PrismTheme.light();
      expect(theme.inputDecorationTheme.border, isNotNull);
    });
  });

  group('PrismColors', () {
    test('navy palette is in ascending darkness order', () {
      // Lower shade = lighter (higher luminance)
      expect(PrismColors.navy100.computeLuminance(),
          greaterThan(PrismColors.navy900.computeLuminance()));
    });

    test('semantic colors reference primitive palette', () {
      expect(PrismColors.interactivePrimary, PrismColors.navy600);
      expect(PrismColors.surfaceElevated, PrismColors.gray100);
      expect(PrismColors.textPrimary, PrismColors.gray900);
    });
  });

  group('PrismSpacing', () {
    test('scale has 8 values', () {
      expect(PrismSpacing.scale.length, 8);
    });

    test('all values divisible by 4', () {
      for (final v in PrismSpacing.scale) {
        expect(v % 4, 0, reason: '$v is not divisible by 4');
      }
    });

    test('scale is ascending', () {
      for (var i = 1; i < PrismSpacing.scale.length; i++) {
        expect(PrismSpacing.scale[i], greaterThan(PrismSpacing.scale[i - 1]));
      }
    });
  });
}
