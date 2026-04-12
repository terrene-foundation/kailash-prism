/**
 * Form Wizard — Multi-step form with step indicator, per-step validation, navigation
 * Spec: docs/specs/05-engine-specifications.md § 5.2 acceptance criterion #9
 */

import {
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { Form, type FormConfig } from './form-root.js';
import type { FieldDef, SectionDef } from './form-types.js';

export interface WizardStep {
  name: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  sections?: SectionDef[];
}

export interface FormWizardConfig {
  steps: WizardStep[];
  validation?: FormConfig['validation'];
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onStepChange?: (step: { from: number; to: number }) => void;
  submitLabel?: string;
  nextLabel?: string;
  backLabel?: string;
  className?: string;
  'aria-label'?: string;
}

// --- Step indicator ---

const indicatorContainerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 0,
  marginBottom: 24,
};

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: WizardStep[];
  currentStep: number;
}) {
  return (
    <nav aria-label="Form steps" style={indicatorContainerStyle}>
      {steps.map((step, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const isLast = index === steps.length - 1;

        return (
          <div
            key={step.name}
            style={{ display: 'flex', alignItems: 'center', flex: isLast ? '0 0 auto' : 1 }}
          >
            {/* Circle */}
            <div
              aria-current={isCurrent ? 'step' : undefined}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
                backgroundColor: isComplete
                  ? 'var(--prism-color-status-success, #16A34A)'
                  : isCurrent
                    ? 'var(--prism-color-interactive-primary, #1E3A5F)'
                    : 'var(--prism-color-surface-elevated, #F1F5F9)',
                color: isComplete || isCurrent
                  ? '#FFFFFF'
                  : 'var(--prism-color-text-secondary, #64748B)',
                transition: 'background-color 200ms, color 200ms',
              }}
            >
              {isComplete ? '✓' : String(index + 1)}
            </div>

            {/* Label */}
            <div style={{ marginLeft: 8, minWidth: 0, flexShrink: 1 }}>
              <div style={{
                fontSize: 13,
                fontWeight: isCurrent ? 600 : 400,
                color: isCurrent
                  ? 'var(--prism-color-text-primary)'
                  : 'var(--prism-color-text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {step.title}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div style={{
                flex: 1,
                height: 2,
                marginLeft: 12,
                marginRight: 12,
                backgroundColor: isComplete
                  ? 'var(--prism-color-status-success, #16A34A)'
                  : 'var(--prism-color-border-default, #E2E8F0)',
                transition: 'background-color 200ms',
              }} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

// --- Wizard ---

export function FormWizard({
  steps,
  validation,
  onSubmit,
  onStepChange,
  submitLabel = 'Submit',
  nextLabel = 'Next',
  backLabel = 'Back',
  className,
  'aria-label': ariaLabel,
}: FormWizardConfig) {
  const [currentStep, setCurrentStep] = useState(0);
  const [collectedValues, setCollectedValues] = useState<Record<string, unknown>>({});

  const step = steps[currentStep]!;
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const initialValuesForStep = useMemo(() => {
    const vals: Record<string, unknown> = {};
    for (const field of step.fields) {
      vals[field.name] = collectedValues[field.name] ?? field.defaultValue ?? '';
    }
    return vals;
  }, [step.fields, collectedValues]);

  const handleStepSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      const merged = { ...collectedValues, ...values };
      setCollectedValues(merged);

      if (isLast) {
        await onSubmit(merged);
      } else {
        const nextStep = currentStep + 1;
        onStepChange?.({ from: currentStep, to: nextStep });
        setCurrentStep(nextStep);
      }
    },
    [collectedValues, currentStep, isLast, onSubmit, onStepChange],
  );

  const handleBack = useCallback(() => {
    if (isFirst) return;
    const prevStep = currentStep - 1;
    onStepChange?.({ from: currentStep, to: prevStep });
    setCurrentStep(prevStep);
  }, [currentStep, isFirst, onStepChange]);

  return (
    <div className={className} aria-label={ariaLabel ?? 'Multi-step form'} role="group">
      <StepIndicator steps={steps} currentStep={currentStep} />

      {/* Step description */}
      {step.description && (
        <p style={{
          fontSize: 14,
          color: 'var(--prism-color-text-secondary)',
          marginBottom: 16,
        }}>
          {step.description}
        </p>
      )}

      {/* Form for current step */}
      <Form
        key={step.name}
        fields={step.fields}
        sections={step.sections}
        validation={validation}
        onSubmit={handleStepSubmit}
        initialValues={initialValuesForStep}
        submitLabel={isLast ? submitLabel : nextLabel}
        showReset={false}
        layout="two-column"
        aria-label={`Step ${currentStep + 1}: ${step.title}`}
      />

      {/* Back button (rendered outside the form to not interfere with submission) */}
      {!isFirst && (
        <div style={{ marginTop: -48, position: 'relative', zIndex: 1 }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--prism-radius-md, 6px)',
              border: '1px solid var(--prism-color-border-default, #d1d5db)',
              backgroundColor: 'transparent',
              color: 'var(--prism-color-text-primary, inherit)',
              cursor: 'pointer',
              fontSize: 'var(--prism-font-size-body, 14px)',
            }}
          >
            {backLabel}
          </button>
        </div>
      )}
    </div>
  );
}
