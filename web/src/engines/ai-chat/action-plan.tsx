/**
 * ActionPlan — Numbered steps with approve/modify/reject
 * Spec: docs/specs/05-engine-specifications.md § 5.6 "Action Plans"
 *
 * Shows a numbered plan that the user can approve, modify, or reject per step.
 */

import { useState, useCallback, type CSSProperties } from 'react';
import type { ActionPlanStep, ActionPlanAction } from './types.js';

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 16,
  backgroundColor: 'var(--prism-color-surface-card, #FFFFFF)',
  border: '1px solid var(--prism-color-border-default, #E2E8F0)',
  borderRadius: 8,
};

const headerStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--prism-color-text-primary, #0F172A)',
  marginBottom: 4,
};

const stepContainerStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  padding: '8px 0',
  borderBottom: '1px solid var(--prism-color-border-default, #F1F5F9)',
};

const stepNumberStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 600,
  flexShrink: 0,
};

const actionButtonStyle: CSSProperties = {
  padding: '4px 10px',
  borderRadius: 4,
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
};

function statusColors(status: ActionPlanStep['status']): { bg: string; text: string } {
  switch (status) {
    case 'approved': return { bg: 'var(--prism-color-surface-success, #F0FDF4)', text: 'var(--prism-color-status-success, #16A34A)' };
    case 'rejected': return { bg: 'var(--prism-color-surface-error, #FEF2F2)', text: 'var(--prism-color-status-error, #DC2626)' };
    case 'modified': return { bg: '#FFFBEB', text: 'var(--prism-color-status-warning, #D97706)' };
    case 'pending': return { bg: 'var(--prism-color-surface-elevated, #F1F5F9)', text: 'var(--prism-color-text-secondary, #64748B)' };
  }
}

export interface ActionPlanProps {
  steps: ActionPlanStep[];
  onResponse: (response: { stepIndex: number; action: ActionPlanAction; modification?: string }) => void;
  className?: string;
}

export function ActionPlan({ steps, onResponse, className }: ActionPlanProps) {
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const handleModify = useCallback((stepIndex: number) => {
    setEditingStep(stepIndex);
    setEditText('');
  }, []);

  const handleSubmitModification = useCallback((stepIndex: number) => {
    if (editText.trim()) {
      onResponse({ stepIndex, action: 'modify', modification: editText.trim() });
    }
    setEditingStep(null);
    setEditText('');
  }, [editText, onResponse]);

  if (steps.length === 0) return null;

  const allResolved = steps.every(s => s.status !== 'pending');

  return (
    <div className={className} style={containerStyle} role="group" aria-label="Action plan">
      <div style={headerStyle}>
        Action Plan ({steps.filter(s => s.status !== 'pending').length}/{steps.length} reviewed)
      </div>

      {steps.map((step) => {
        const colors = statusColors(step.status);
        return (
          <div key={step.index} style={stepContainerStyle}>
            <div style={{
              ...stepNumberStyle,
              backgroundColor: colors.bg,
              color: colors.text,
            }}>
              {step.status === 'approved' ? '✓'
                : step.status === 'rejected' ? '✗'
                : step.status === 'modified' ? '~'
                : String(step.index + 1)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                color: 'var(--prism-color-text-primary)',
                fontSize: 14,
                lineHeight: 1.5,
              }}>
                {step.description}
              </div>
              {step.modification && (
                <div style={{
                  marginTop: 4,
                  padding: '4px 8px',
                  borderRadius: 4,
                  backgroundColor: '#FFFBEB',
                  fontSize: 12,
                  color: 'var(--prism-color-status-warning)',
                }}>
                  Modified: {step.modification}
                </div>
              )}

              {/* Editing mode */}
              {editingStep === step.index && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    placeholder="Describe the modification..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmitModification(step.index);
                      if (e.key === 'Escape') setEditingStep(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--prism-color-border-default)',
                      fontSize: 13,
                    }}
                  />
                  <button
                    onClick={() => handleSubmitModification(step.index)}
                    disabled={!editText.trim()}
                    style={{
                      ...actionButtonStyle,
                      backgroundColor: 'var(--prism-color-interactive-primary)',
                      color: '#fff',
                      opacity: editText.trim() ? 1 : 0.5,
                    }}
                  >
                    Save
                  </button>
                </div>
              )}

              {/* Action buttons for pending steps */}
              {step.status === 'pending' && editingStep !== step.index && (
                <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => onResponse({ stepIndex: step.index, action: 'approve' })}
                    style={{
                      ...actionButtonStyle,
                      backgroundColor: 'var(--prism-color-status-success, #16A34A)',
                      color: '#fff',
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleModify(step.index)}
                    style={{
                      ...actionButtonStyle,
                      backgroundColor: 'var(--prism-color-status-warning, #D97706)',
                      color: '#fff',
                    }}
                  >
                    Modify
                  </button>
                  <button
                    onClick={() => onResponse({ stepIndex: step.index, action: 'reject' })}
                    style={{
                      ...actionButtonStyle,
                      backgroundColor: 'var(--prism-color-status-error, #DC2626)',
                      color: '#fff',
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {allResolved && (
        <div style={{
          textAlign: 'center',
          padding: 8,
          color: 'var(--prism-color-status-success)',
          fontWeight: 500,
          fontSize: 13,
        }}>
          All steps reviewed
        </div>
      )}
    </div>
  );
}
