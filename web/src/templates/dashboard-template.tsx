/**
 * Dashboard Template
 * Spec: docs/specs/06-page-templates.md § 6.2.1
 *
 * Zones: page-header, stats-row, primary-chart, secondary-content, detail-grid
 */

import type { ReactNode } from 'react';
import { useLayout, VStack, Row, Grid, Split } from '../engines/layout.js';
import { TemplateHeader } from './template-shell.js';
import type { BaseTemplateProps } from './types.js';

export interface DashboardTemplateProps extends BaseTemplateProps {
  /** 3-6 MetricCards */
  statsRow?: ReactNode;
  /** Main chart or visualization */
  primaryChart?: ReactNode;
  /** Activity feed, list, or secondary chart */
  secondaryContent?: ReactNode;
  /** Additional cards/widgets grid */
  detailGrid?: ReactNode;
}

export function DashboardTemplate({
  title,
  subtitle,
  headerActions,
  statsRow,
  primaryChart,
  secondaryContent,
  detailGrid,
  className,
}: DashboardTemplateProps) {
  const { isMobile, isTablet } = useLayout();

  return (
    <VStack gap={24} padding={0} className={className}>
      <TemplateHeader title={title} subtitle={subtitle} headerActions={headerActions} />

      {statsRow && (
        <Grid columns={{ mobile: 1, tablet: 2, desktop: 4 }} gap={16}>
          {statsRow}
        </Grid>
      )}

      {(primaryChart || secondaryContent) && (
        isMobile || isTablet ? (
          <VStack gap={16}>
            {primaryChart}
            {secondaryContent}
          </VStack>
        ) : (
          <Split ratio="2:1" gap={16}>
            {[primaryChart ?? <div />, secondaryContent ?? <div />]}
          </Split>
        )
      )}

      {detailGrid && (
        <Grid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap={16}>
          {detailGrid}
        </Grid>
      )}
    </VStack>
  );
}
