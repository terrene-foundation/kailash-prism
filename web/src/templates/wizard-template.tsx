/**
 * Wizard Template
 * Spec: docs/specs/06-page-templates.md § 6.2.9
 *
 * Multi-step workflow with centered content area and step indicator.
 */

import type { ReactNode } from 'react';
import { VStack } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface WizardTemplateProps extends BaseTemplateProps {
  /** The wizard form (FormWizard or custom step content) */
  content: ReactNode;
  /** Max width of the wizard area. Default: 640 */
  maxWidth?: number;
}

export function WizardTemplate({
  title,
  subtitle,
  headerActions,
  content,
  maxWidth = 640,
  className,
}: WizardTemplateProps) {
  return (
    <VStack gap={24} padding={0} className={className}>
      <TemplateHeader title={title} subtitle={subtitle} headerActions={headerActions} />
      <div style={{
        maxWidth,
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        {content}
      </div>
    </VStack>
  );
}
