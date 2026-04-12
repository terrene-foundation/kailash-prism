import 'package:flutter/widgets.dart';

/// Breakpoint definitions matching the web engine.
enum KBreakpoint { mobile, tablet, desktop, wide }

/// Breakpoint boundaries in logical pixels.
abstract final class KBreakpoints {
  static const double mobile = 0;
  static const double tablet = 768;
  static const double desktop = 1024;
  static const double wide = 1440;

  /// Resolve the current breakpoint from width.
  static KBreakpoint resolve(double width) {
    if (width >= wide) return KBreakpoint.wide;
    if (width >= desktop) return KBreakpoint.desktop;
    if (width >= tablet) return KBreakpoint.tablet;
    return KBreakpoint.mobile;
  }
}

/// Responsive value that varies by breakpoint.
///
/// ```dart
/// final columns = KResponsiveValue<int>(
///   mobile: 1,
///   tablet: 2,
///   desktop: 3,
///   wide: 4,
/// );
/// final resolved = columns.resolve(KBreakpoint.desktop); // 3
/// ```
class KResponsiveValue<T> {
  final T? mobile;
  final T? tablet;
  final T? desktop;
  final T? wide;

  const KResponsiveValue({
    this.mobile,
    this.tablet,
    this.desktop,
    this.wide,
  });

  /// Resolve value for the given breakpoint using mobile-first cascade.
  T resolve(KBreakpoint breakpoint, {required T fallback}) {
    switch (breakpoint) {
      case KBreakpoint.wide:
        return wide ?? desktop ?? tablet ?? mobile ?? fallback;
      case KBreakpoint.desktop:
        return desktop ?? tablet ?? mobile ?? fallback;
      case KBreakpoint.tablet:
        return tablet ?? mobile ?? fallback;
      case KBreakpoint.mobile:
        return mobile ?? fallback;
    }
  }
}

/// Widget that rebuilds its child based on the current breakpoint.
///
/// Uses [LayoutBuilder] to detect available width.
///
/// ```dart
/// KResponsiveBuilder(
///   builder: (context, breakpoint, constraints) {
///     if (breakpoint == KBreakpoint.mobile) return MobileView();
///     return DesktopView();
///   },
/// );
/// ```
class KResponsiveBuilder extends StatelessWidget {
  final Widget Function(BuildContext context, KBreakpoint breakpoint, BoxConstraints constraints) builder;

  const KResponsiveBuilder({super.key, required this.builder});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final breakpoint = KBreakpoints.resolve(constraints.maxWidth);
        return builder(context, breakpoint, constraints);
      },
    );
  }
}

/// InheritedWidget providing the current breakpoint to descendants.
class KBreakpointProvider extends StatelessWidget {
  final Widget child;

  const KBreakpointProvider({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        return _KBreakpointInherited(
          breakpoint: breakpoint,
          child: child,
        );
      },
    );
  }

  /// Get the current breakpoint from context.
  static KBreakpoint of(BuildContext context) {
    final inherited = context.dependOnInheritedWidgetOfExactType<_KBreakpointInherited>();
    assert(inherited != null, 'KBreakpointProvider not found in widget tree. Wrap with KBreakpointProvider.');
    return inherited!.breakpoint;
  }
}

class _KBreakpointInherited extends InheritedWidget {
  final KBreakpoint breakpoint;

  const _KBreakpointInherited({required this.breakpoint, required super.child});

  @override
  bool updateShouldNotify(_KBreakpointInherited oldWidget) {
    return breakpoint != oldWidget.breakpoint;
  }
}
