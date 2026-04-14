import 'dart:ui';

/// Enterprise color tokens from design-system.yaml.
/// Generated values — match specs/tokens/themes/enterprise.yaml.
abstract final class PrismColors {
  // Navy family (brand primary)
  static const navy100 = Color(0xFFD0DBE8);
  static const navy200 = Color(0xFFA1B7D1);
  static const navy300 = Color(0xFF7293BA);
  static const navy400 = Color(0xFF4370A3);
  static const navy500 = Color(0xFF2D5A8E);
  static const navy600 = Color(0xFF1E3A5F);
  static const navy700 = Color(0xFF152C49);
  static const navy800 = Color(0xFF0F2440);
  static const navy900 = Color(0xFF0A1929);

  // Gray / Slate family
  static const gray50 = Color(0xFFF8FAFC);
  static const gray100 = Color(0xFFF1F5F9);
  static const gray200 = Color(0xFFE2E8F0);
  static const gray300 = Color(0xFFCBD5E1);
  static const gray400 = Color(0xFF94A3B8);
  static const gray500 = Color(0xFF64748B);
  static const gray600 = Color(0xFF475569);
  static const gray700 = Color(0xFF334155);
  static const gray800 = Color(0xFF1E293B);
  static const gray900 = Color(0xFF0F172A);

  // Semantic colors (light mode)
  static const interactivePrimary = navy600;
  static const interactivePrimaryHover = navy700;
  static const surfacePage = Color(0xFFFFFFFF);
  static const surfaceCard = Color(0xFFFFFFFF);
  static const surfaceElevated = gray100;
  static const textPrimary = gray900;
  static const textSecondary = gray500;
  static const textDisabled = gray400;
  static const textOnPrimary = Color(0xFFFFFFFF);
  static const borderDefault = gray200;
  static const borderSubtle = gray100;
  static const statusError = Color(0xFFDC2626);
  static const statusSuccess = Color(0xFF16A34A);
  static const statusWarning = Color(0xFFD97706);
  static const statusInfo = Color(0xFF2563EB);
  static const textTertiary = gray400;
  static const primary = interactivePrimary;
  static const surfaceActive = Color(0xFFEFF6FF);

  // Dark mode overrides
  static const darkInteractivePrimary = Color(0xFF60A5FA);
  static const darkSurfacePage = gray900;
  static const darkSurfaceCard = gray800;
  static const darkSurfaceElevated = gray700;
  static const darkTextPrimary = gray50;
  static const darkTextSecondary = gray400;
  static const darkBorderDefault = gray700;
}
