/// Kailash Prism — Flutter composable engine library
///
/// Provides design tokens, layout primitives, and pre-built engines
/// for building enterprise Flutter applications from Prism specifications.
///
/// ```dart
/// import 'package:kailash_prism/kailash_prism.dart';
///
/// MaterialApp(
///   theme: PrismTheme.light(),
///   darkTheme: PrismTheme.dark(),
///   home: KLayoutShell(child: MyApp()),
/// );
/// ```
library;

// Theme
export 'theme/prism_theme.dart';
export 'theme/prism_colors.dart';
export 'theme/prism_spacing.dart';
export 'theme/prism_typography.dart';

// Layout
export 'layouts/k_layout.dart';
export 'layouts/k_responsive.dart';
