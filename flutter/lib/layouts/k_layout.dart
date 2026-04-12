import 'package:flutter/widgets.dart';
import 'k_responsive.dart';

/// KStack — Vertical or horizontal flex layout.
///
/// Equivalent to web VStack (vertical) and Row (horizontal).
class KStack extends StatelessWidget {
  final List<Widget> children;
  final Axis direction;
  final double gap;
  final MainAxisAlignment mainAxisAlignment;
  final CrossAxisAlignment crossAxisAlignment;
  final EdgeInsetsGeometry padding;

  const KStack({
    super.key,
    required this.children,
    this.direction = Axis.vertical,
    this.gap = 0,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.crossAxisAlignment = CrossAxisAlignment.stretch,
    this.padding = EdgeInsets.zero,
  });

  /// Vertical stack (equivalent to web VStack).
  const KStack.vertical({
    super.key,
    required this.children,
    this.gap = 0,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.crossAxisAlignment = CrossAxisAlignment.stretch,
    this.padding = EdgeInsets.zero,
  }) : direction = Axis.vertical;

  /// Horizontal stack (equivalent to web Row).
  const KStack.horizontal({
    super.key,
    required this.children,
    this.gap = 0,
    this.mainAxisAlignment = MainAxisAlignment.start,
    this.crossAxisAlignment = CrossAxisAlignment.center,
    this.padding = EdgeInsets.zero,
  }) : direction = Axis.horizontal;

  @override
  Widget build(BuildContext context) {
    final spaced = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      spaced.add(children[i]);
      if (gap > 0 && i < children.length - 1) {
        spaced.add(SizedBox(
          width: direction == Axis.horizontal ? gap : 0,
          height: direction == Axis.vertical ? gap : 0,
        ));
      }
    }

    final flex = direction == Axis.vertical
        ? Column(
            mainAxisAlignment: mainAxisAlignment,
            crossAxisAlignment: crossAxisAlignment,
            mainAxisSize: MainAxisSize.min,
            children: spaced,
          )
        : Row(
            mainAxisAlignment: mainAxisAlignment,
            crossAxisAlignment: crossAxisAlignment,
            mainAxisSize: MainAxisSize.min,
            children: spaced,
          );

    if (padding == EdgeInsets.zero) return flex;
    return Padding(padding: padding, child: flex);
  }
}

/// KGrid — Responsive grid layout.
///
/// Uses [Wrap] for flexible grid behavior. Columns adjust per breakpoint.
class KGrid extends StatelessWidget {
  final List<Widget> children;
  final KResponsiveValue<int>? columns;
  final int defaultColumns;
  final double gap;
  final double rowGap;

  const KGrid({
    super.key,
    required this.children,
    this.columns,
    this.defaultColumns = 1,
    this.gap = 16,
    this.rowGap = 16,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, constraints) {
        final cols = columns?.resolve(breakpoint, fallback: defaultColumns) ?? defaultColumns;
        final availableWidth = constraints.maxWidth - (gap * (cols - 1));
        final itemWidth = availableWidth / cols;

        return Wrap(
          spacing: gap,
          runSpacing: rowGap,
          children: children.map((child) {
            return SizedBox(width: itemWidth.clamp(0, constraints.maxWidth), child: child);
          }).toList(),
        );
      },
    );
  }
}

/// KSplit — Two-panel layout with responsive stacking.
///
/// On mobile, panels stack vertically. On desktop+, side by side.
class KSplit extends StatelessWidget {
  final Widget primary;
  final Widget secondary;
  final double primaryFlex;
  final double secondaryFlex;
  final double gap;

  const KSplit({
    super.key,
    required this.primary,
    required this.secondary,
    this.primaryFlex = 2,
    this.secondaryFlex = 1,
    this.gap = 0,
  });

  @override
  Widget build(BuildContext context) {
    return KResponsiveBuilder(
      builder: (context, breakpoint, _) {
        if (breakpoint == KBreakpoint.mobile) {
          return KStack.vertical(
            gap: gap,
            children: [primary, secondary],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(flex: primaryFlex.round(), child: primary),
            if (gap > 0) SizedBox(width: gap),
            Expanded(flex: secondaryFlex.round(), child: secondary),
          ],
        );
      },
    );
  }
}
