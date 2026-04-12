import 'package:flutter/material.dart';
import '../theme/prism_colors.dart';
import '../theme/prism_spacing.dart';

/// KButton — Primary interactive element atom.
/// Mirrors web Button: 5 variants × 3 sizes + loading + icons.
enum KButtonVariant { primary, secondary, tertiary, destructive, ghost }

enum KButtonSize { sm, md, lg }

class KButton extends StatelessWidget {
  final Widget child;
  final VoidCallback? onPressed;
  final KButtonVariant variant;
  final KButtonSize size;
  final bool loading;
  final Widget? iconLeft;
  final Widget? iconRight;
  final bool disabled;

  const KButton({
    super.key,
    required this.child,
    this.onPressed,
    this.variant = KButtonVariant.primary,
    this.size = KButtonSize.md,
    this.loading = false,
    this.iconLeft,
    this.iconRight,
    this.disabled = false,
  });

  double get _height {
    switch (size) {
      case KButtonSize.sm:
        return 32;
      case KButtonSize.md:
        return 40;
      case KButtonSize.lg:
        return 44;
    }
  }

  EdgeInsets get _padding {
    switch (size) {
      case KButtonSize.sm:
        return const EdgeInsets.symmetric(horizontal: 12);
      case KButtonSize.md:
        return const EdgeInsets.symmetric(horizontal: 16);
      case KButtonSize.lg:
        return const EdgeInsets.symmetric(horizontal: 20);
    }
  }

  double get _fontSize => size == KButtonSize.sm ? 12 : 14;

  ({Color bg, Color fg, BorderSide border}) _tokens() {
    switch (variant) {
      case KButtonVariant.primary:
        return (
          bg: PrismColors.interactivePrimary,
          fg: PrismColors.textOnPrimary,
          border: BorderSide.none,
        );
      case KButtonVariant.secondary:
        return (
          bg: Colors.transparent,
          fg: PrismColors.interactivePrimary,
          border: const BorderSide(color: PrismColors.interactivePrimary),
        );
      case KButtonVariant.tertiary:
        return (
          bg: Colors.transparent,
          fg: PrismColors.interactivePrimary,
          border: const BorderSide(color: PrismColors.borderDefault),
        );
      case KButtonVariant.destructive:
        return (
          bg: PrismColors.statusError,
          fg: Colors.white,
          border: BorderSide.none,
        );
      case KButtonVariant.ghost:
        return (
          bg: Colors.transparent,
          fg: PrismColors.textPrimary,
          border: BorderSide.none,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = _tokens();
    final isEnabled = !disabled && !loading && onPressed != null;

    final children = <Widget>[
      if (loading)
        SizedBox(
          width: _fontSize,
          height: _fontSize,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(tokens.fg),
          ),
        )
      else if (iconLeft != null)
        iconLeft!,
      if ((loading || iconLeft != null)) const SizedBox(width: PrismSpacing.sm),
      DefaultTextStyle.merge(
        style: TextStyle(
          color: tokens.fg,
          fontSize: _fontSize,
          fontWeight: FontWeight.w500,
        ),
        child: IconTheme.merge(
          data: IconThemeData(color: tokens.fg, size: _fontSize + 2),
          child: child,
        ),
      ),
      if (!loading && iconRight != null) ...[
        const SizedBox(width: PrismSpacing.sm),
        iconRight!,
      ],
    ];

    return Semantics(
      button: true,
      enabled: isEnabled,
      child: Opacity(
        opacity: isEnabled ? 1.0 : 0.6,
        child: Material(
          color: tokens.bg,
          borderRadius: BorderRadius.circular(PrismRadius.sm),
          child: InkWell(
            onTap: isEnabled ? onPressed : null,
            borderRadius: BorderRadius.circular(PrismRadius.sm),
            child: Container(
              height: _height,
              padding: _padding,
              decoration: BoxDecoration(
                border: tokens.border == BorderSide.none
                    ? null
                    : Border.fromBorderSide(tokens.border),
                borderRadius: BorderRadius.circular(PrismRadius.sm),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: children,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
