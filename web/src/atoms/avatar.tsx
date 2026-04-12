/**
 * Avatar Atom
 * Spec: specs/components/avatar.yaml
 *
 * User or entity representation. Image with fallback to initials.
 */

import { useState, type CSSProperties, type ImgHTMLAttributes } from 'react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  name?: string;
  size?: AvatarSize;
  src?: string;
  className?: string;
}

const SIZE_MAP: Record<AvatarSize, number> = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return `${parts[0]![0]!.toUpperCase()}${parts[parts.length - 1]![0]!.toUpperCase()}`;
}

function hashColor(name: string): string {
  let hash = 0;
  for (const ch of name) {
    hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

export function Avatar({ name, size = 'md', src, className, alt, ...imgProps }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const px = SIZE_MAP[size];

  const baseStyle: CSSProperties = {
    width: px,
    height: px,
    borderRadius: 9999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
    fontSize: px * 0.4,
    fontWeight: 600,
  };

  if (src && !imgError) {
    return (
      <img
        {...imgProps}
        src={src}
        alt={alt ?? name ?? 'Avatar'}
        onError={() => setImgError(true)}
        className={className}
        style={{ ...baseStyle, objectFit: 'cover' }}
      />
    );
  }

  const initials = name ? getInitials(name) : '?';
  const bgColor = name ? hashColor(name) : 'var(--prism-color-surface-elevated, #E2E8F0)';

  return (
    <span
      role="img"
      aria-label={name ?? 'Unknown user'}
      className={className}
      style={{ ...baseStyle, backgroundColor: bgColor, color: '#FFFFFF' }}
    >
      {initials}
    </span>
  );
}
