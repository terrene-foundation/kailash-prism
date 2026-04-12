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

// Atoms
export 'atoms/k_button.dart';
export 'atoms/k_badge.dart';
export 'atoms/k_avatar.dart';
export 'atoms/k_spinner.dart';

// Templates
export 'templates/k_templates.dart';

// Engines
export 'engines/k_navigation.dart';
export 'engines/k_data_table.dart';
export 'engines/k_form.dart';
export 'engines/k_chat.dart';
