/**
 * Split Template
 * Spec: docs/specs/06-page-templates.md § 6.2.8
 *
 * Two-panel layout (master-detail, side-by-side comparison, etc.)
 */

import type { ReactNode } from 'react';
import { useLayout, VStack, Split } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface SplitTemplateProps extends BaseTemplateProps {
  /** Left/primary panel */
  primary: ReactNode;
  /** Right/secondary panel */
  secondary: ReactNode;
  /** Split ratio. Default: "1:1" */
  ratio?: string;
}

export function SplitTemplate({
  title,
  subtitle,
  headerActions,
  primary,
  secondary,
  ratio = '1:1',
  className,
}: SplitTemplateProps) {
  const { isMobile } = useLayout();

  return (
    <VStack gap={24} padding={0} className={className}>
      <TemplateHeader title={title} subtitle={subtitle} headerActions={headerActions} />
      {isMobile ? (
        <VStack gap={16}>
          {primary}
          {secondary}
        </VStack>
      ) : (
        <Split ratio={ratio} gap={24}>
          {[primary, secondary]}
        </Split>
      )}
    </VStack>
  );
}
