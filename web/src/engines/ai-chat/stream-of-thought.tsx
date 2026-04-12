/**
 * StreamOfThought — Tool call step visualization
 * Spec: docs/specs/05-engine-specifications.md § 5.6 "Tool Call Visualization"
 *
 * Displays a vertical step list showing tool call progress:
 *   ✓ Searching knowledge base...     (1.2s)
 *   ⟳ Analyzing 3 relevant documents  (...)
 *   ○ Generating summary              (queued)
 */

import type { CSSProperties } from 'react';
import type { ToolCallStep } from './types.js';

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '8px 12px',
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
  border: '1px solid var(--prism-color-border-default, #E2E8F0)',
  borderRadius: 8,
  fontSize: 13,
};

const stepStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  lineHeight: 1.4,
};

function statusIcon(status: ToolCallStep['status']): string {
  switch (status) {
    case 'done': return '✓';
    case 'running': return '⟳';
    case 'error': return '✗';
    case 'queued': return '○';
  }
}

function statusColor(status: ToolCallStep['status']): string {
  switch (status) {
    case 'done': return 'var(--prism-color-status-success, #16A34A)';
    case 'running': return 'var(--prism-color-interactive-primary, #2563EB)';
    case 'error': return 'var(--prism-color-status-error, #DC2626)';
    case 'queued': return 'var(--prism-color-text-disabled, #94A3B8)';
  }
}

function formatDuration(ms: number | undefined): string {
  if (ms == null) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export interface StreamOfThoughtProps {
  steps: ToolCallStep[];
  className?: string;
}

export function StreamOfThought({ steps, className }: StreamOfThoughtProps) {
  if (steps.length === 0) return null;

  return (
    <div
      role="status"
      aria-label="Tool execution progress"
      className={className}
      style={containerStyle}
    >
      {steps.map((step) => (
        <div key={step.id} style={stepStyle}>
          <span
            style={{
              color: statusColor(step.status),
              fontWeight: 600,
              minWidth: 16,
              textAlign: 'center',
            }}
            aria-hidden="true"
          >
            {statusIcon(step.status)}
          </span>
          <span style={{
            flex: 1,
            color: step.status === 'queued'
              ? 'var(--prism-color-text-disabled, #94A3B8)'
              : 'var(--prism-color-text-primary, #0F172A)',
          }}>
            {step.summary ?? step.name}
          </span>
          <span style={{
            fontSize: 11,
            color: 'var(--prism-color-text-secondary, #64748B)',
            minWidth: 40,
            textAlign: 'right',
          }}>
            {step.status === 'running' ? '...' : formatDuration(step.duration)}
          </span>
        </div>
      ))}
    </div>
  );
}
