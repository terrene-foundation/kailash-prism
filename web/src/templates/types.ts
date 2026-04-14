/**
 * Page Template — Shared types
 * Spec: docs/specs/06-page-templates.md
 *
 * Templates define named zones that consumers populate with content.
 * Each zone has a layout, responsive behavior, and default content.
 */

import type { ReactNode } from 'react';

/** Content for a named zone in a page template */
export interface ZoneSlot {
  children: ReactNode;
  /** Override the default zone visibility at breakpoints */
  visible?: {
    mobile?: boolean;
    tablet?: boolean;
    desktop?: boolean;
    wide?: boolean;
  };
}

/** Common props shared by all page templates */
export interface BaseTemplateProps {
  /** Page title displayed in the header zone */
  title: string;
  /** Subtitle or description */
  subtitle?: string | undefined;
  /** Actions rendered in the header (buttons, dropdowns) */
  headerActions?: ReactNode | undefined;
  /** Additional CSS class */
  className?: string | undefined;
}
