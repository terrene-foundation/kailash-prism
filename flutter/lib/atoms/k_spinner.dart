import 'package:flutter/material.dart';
import '../theme/prism_colors.dart';

/// KSpinner — Loading indicator atom with accessible label.
/// Mirrors web Spinner: 3 sizes, status role.
enum KSpinnerSize { sm, md, lg }

class KSpinner extends StatelessWidget {
  final KSpinnerSize size;
  final String label;

  const KSpinner({super.key, this.size = KSpinnerSize.md, this.label = 'Loading'});

  double get _pixelSize {
    switch (size) {
      case KSpinnerSize.sm:
        return 16;
      case KSpinnerSize.md:
        return 24;
      case KSpinnerSize.lg:
        return 36;
    }
  }

  @override
  Widget build(BuildContext context) {
    final px = _pixelSize;
    final strokeWidth = (px / 8).clamp(2.0, 4.0);

    return Semantics(
      label: label,
      liveRegion: true,
      child: SizedBox(
        width: px,
        height: px,
        child: CircularProgressIndicator(
          strokeWidth: strokeWidth,
          valueColor: const AlwaysStoppedAnimation<Color>(PrismColors.interactivePrimary),
          backgroundColor: PrismColors.borderDefault,
        ),
      ),
    );
  }
}
