/// Spacing scale from design-system.yaml.
/// All values in logical pixels. All divisible by 4.
abstract final class PrismSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;
  static const double xxxxl = 64;

  /// Full spacing scale
  static const List<double> scale = [4, 8, 12, 16, 24, 32, 48, 64];
}

/// Border radius scale from design-system.yaml.
abstract final class PrismRadius {
  static const double none = 0;
  static const double xs = 2;
  static const double sm = 4;
  static const double md = 8;
  static const double lg = 12;
  static const double xl = 16;
  static const double pill = 9999;
}
