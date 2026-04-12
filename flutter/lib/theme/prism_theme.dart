import 'package:flutter/material.dart';
import 'prism_colors.dart';
import 'prism_typography.dart';

/// Prism theme generator.
///
/// Produces Material 3 [ThemeData] from Prism design tokens.
/// Use in MaterialApp:
///
/// ```dart
/// MaterialApp(
///   theme: PrismTheme.light(),
///   darkTheme: PrismTheme.dark(),
/// );
/// ```
abstract final class PrismTheme {
  /// Light theme from enterprise design tokens.
  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: const ColorScheme.light(
        primary: PrismColors.interactivePrimary,
        onPrimary: PrismColors.textOnPrimary,
        secondary: PrismColors.navy400,
        surface: PrismColors.surfacePage,
        onSurface: PrismColors.textPrimary,
        error: PrismColors.statusError,
        outline: PrismColors.borderDefault,
      ),
      fontFamily: PrismTypography.fontFamilySans,
      textTheme: _textTheme(Brightness.light),
      cardTheme: const CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          side: BorderSide(color: PrismColors.borderDefault),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: PrismColors.borderDefault),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: PrismColors.borderDefault),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: PrismColors.interactivePrimary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: PrismColors.interactivePrimary,
          foregroundColor: PrismColors.textOnPrimary,
          minimumSize: const Size(0, 40),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
          textStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: PrismColors.interactivePrimary,
          minimumSize: const Size(0, 40),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
          side: const BorderSide(color: PrismColors.interactivePrimary),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: PrismColors.borderDefault,
        thickness: 1,
      ),
      scaffoldBackgroundColor: PrismColors.surfacePage,
    );
  }

  /// Dark theme from enterprise design tokens.
  static ThemeData dark() {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: PrismColors.darkInteractivePrimary,
        onPrimary: PrismColors.gray900,
        secondary: PrismColors.navy300,
        surface: PrismColors.darkSurfacePage,
        onSurface: PrismColors.darkTextPrimary,
        error: PrismColors.statusError,
        outline: PrismColors.darkBorderDefault,
      ),
      fontFamily: PrismTypography.fontFamilySans,
      textTheme: _textTheme(Brightness.dark),
      cardTheme: const CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(8)),
          side: BorderSide(color: PrismColors.darkBorderDefault),
        ),
      ),
      scaffoldBackgroundColor: PrismColors.darkSurfacePage,
    );
  }

  static TextTheme _textTheme(Brightness brightness) {
    final color = brightness == Brightness.light
        ? PrismColors.textPrimary
        : PrismColors.darkTextPrimary;
    final secondary = brightness == Brightness.light
        ? PrismColors.textSecondary
        : PrismColors.darkTextSecondary;

    return TextTheme(
      headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, height: 1.25, color: color),
      headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, height: 1.25, color: color),
      headlineSmall: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, height: 1.3, color: color),
      titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, height: 1.3, color: color),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, height: 1.4, color: color),
      bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, height: 1.5, color: color),
      bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, height: 1.5, color: color),
      bodySmall: TextStyle(fontSize: 12, fontWeight: FontWeight.w400, height: 1.5, color: secondary),
      labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, height: 1.4, color: color),
      labelMedium: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, height: 1.4, color: secondary),
    );
  }
}
