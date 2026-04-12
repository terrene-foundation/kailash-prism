import 'package:flutter/material.dart';
import '../theme/prism_colors.dart';

/// KAvatar — User or entity representation atom.
/// Mirrors web Avatar: image with initials fallback, hash-based background color,
/// 5 sizes.
enum KAvatarSize { xs, sm, md, lg, xl }

class KAvatar extends StatelessWidget {
  final String? name;
  final String? imageUrl;
  final KAvatarSize size;

  const KAvatar({super.key, this.name, this.imageUrl, this.size = KAvatarSize.md});

  double get _pixelSize {
    switch (size) {
      case KAvatarSize.xs:
        return 24;
      case KAvatarSize.sm:
        return 32;
      case KAvatarSize.md:
        return 40;
      case KAvatarSize.lg:
        return 48;
      case KAvatarSize.xl:
        return 64;
    }
  }

  static String initialsFor(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return '?';
    final parts = trimmed.split(RegExp(r'\s+'));
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return (parts.first[0] + parts.last[0]).toUpperCase();
  }

  static Color hashColor(String name) {
    var hash = 0;
    for (final codeUnit in name.codeUnits) {
      hash = ((hash << 5) - hash + codeUnit) & 0xFFFFFFFF;
    }
    final hue = (hash.abs() % 360).toDouble();
    return HSLColor.fromAHSL(1.0, hue, 0.45, 0.55).toColor();
  }

  @override
  Widget build(BuildContext context) {
    final px = _pixelSize;
    final label = name ?? 'Unknown user';

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return Semantics(
        label: label,
        image: true,
        child: ClipOval(
          child: Image.network(
            imageUrl!,
            width: px,
            height: px,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => _buildInitials(px),
          ),
        ),
      );
    }

    return Semantics(label: label, image: true, child: _buildInitials(px));
  }

  Widget _buildInitials(double px) {
    final text = name != null ? initialsFor(name!) : '?';
    final bgColor = name != null ? hashColor(name!) : PrismColors.surfaceElevated;

    return Container(
      width: px,
      height: px,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: bgColor, shape: BoxShape.circle),
      child: Text(
        text,
        style: TextStyle(
          color: Colors.white,
          fontSize: px * 0.4,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
