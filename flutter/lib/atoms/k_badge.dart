import 'package:flutter/material.dart';
import '../theme/prism_colors.dart';
import '../theme/prism_spacing.dart';

/// KBadge — Small status indicator or count label.
/// Mirrors web Badge: 6 variants × 2 sizes + dot mode.
enum KBadgeVariant { defaultVariant, primary, success, warning, error, info }

enum KBadgeSize { sm, md }

class KBadge extends StatelessWidget {
  final Widget? child;
  final KBadgeVariant variant;
  final KBadgeSize size;
  final bool dot;

  const KBadge({
    super.key,
    this.child,
    this.variant = KBadgeVariant.defaultVariant,
    this.size = KBadgeSize.sm,
    this.dot = false,
  }) : assert(dot || child != null, 'Non-dot KBadge requires a child');

  ({Color bg, Color fg}) _tokens() {
    switch (variant) {
      case KBadgeVariant.defaultVariant:
        return (bg: PrismColors.surfaceElevated, fg: PrismColors.textSecondary);
      case KBadgeVariant.primary:
        return (bg: PrismColors.interactivePrimary, fg: PrismColors.textOnPrimary);
      case KBadgeVariant.success:
        return (bg: const Color(0xFFF0FDF4), fg: PrismColors.statusSuccess);
      case KBadgeVariant.warning:
        return (bg: const Color(0xFFFEF3C7), fg: PrismColors.statusWarning);
      case KBadgeVariant.error:
        return (bg: const Color(0xFFFEF2F2), fg: PrismColors.statusError);
      case KBadgeVariant.info:
        return (bg: const Color(0xFFEFF6FF), fg: PrismColors.statusInfo);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = _tokens();

    if (dot) {
      return Semantics(
        label: 'Status indicator',
        child: Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: tokens.bg, shape: BoxShape.circle),
        ),
      );
    }

    final height = size == KBadgeSize.sm ? 18.0 : 22.0;
    final horizontalPadding = size == KBadgeSize.sm ? 6.0 : 8.0;
    final fontSize = size == KBadgeSize.sm ? 11.0 : 12.0;

    return Container(
      constraints: BoxConstraints(minWidth: height),
      height: height,
      padding: EdgeInsets.symmetric(horizontal: horizontalPadding),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: tokens.bg,
        borderRadius: BorderRadius.circular(PrismRadius.pill),
      ),
      child: DefaultTextStyle.merge(
        style: TextStyle(
          color: tokens.fg,
          fontSize: fontSize,
          fontWeight: FontWeight.w500,
          height: 1.0,
        ),
        child: child!,
      ),
    );
  }
}
