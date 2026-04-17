/**
 * Form Engine — Root component with state management, validation, submission
 * Spec: docs/specs/05-engine-specifications.md § 5.2
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useReducer,
  useRef,
  type FormEvent,
} from 'react';
import { type ZodError } from 'zod';
import {
  type FieldDef,
  type FormActionsState,
  type SectionDef,
  type FormConfig,
  type FormStatus,
  type FormState,
  formReducer,
  evaluateCondition,
  validateFieldRules,
} from './form-types.js';
import { FieldRenderer, FormSection } from './form-fields.js';

// --- Context ---

interface FormContextValue {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  status: FormStatus;
  setValue: (field: string, value: unknown) => void;
  touchField: (field: string) => void;
}

const FormContext = createContext<FormContextValue | null>(null);

export function useFormContext(): FormContextValue {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error(
      'useFormContext() must be used within a <Form>. ' +
      'Wrap your fields with <Form fields={...} onSubmit={...}>.',
    );
  }
  return ctx;
}

// --- Feedback banner ---

const FEEDBACK_TOKENS: Record<'error' | 'success', { bg: string; border: string; color: string }> = {
  error: { bg: 'var(--prism-color-surface-error, #fef2f2)', border: 'var(--prism-color-status-error, #dc2626)', color: 'var(--prism-color-status-error, #dc2626)' },
  success: { bg: 'var(--prism-color-surface-success, #f0fdf4)', border: 'var(--prism-color-status-success, #16a34a)', color: 'var(--prism-color-status-success, #16a34a)' },
};

function FormFeedback({ variant, role, children }: { variant: 'error' | 'success'; role: string; children: ReactNode }) {
  const t = FEEDBACK_TOKENS[variant];
  return (
    <div role={role} style={{
      padding: 'var(--prism-spacing-md, 12px)', backgroundColor: t.bg,
      border: `1px solid ${t.border}`, borderRadius: 'var(--prism-radius-md, 6px)',
      color: t.color, fontSize: 'var(--prism-font-size-body, 14px)',
    }}>{children}</div>
  );
}

// --- Form component ---

export function Form({
  fields,
  sections,
  validation,
  onSubmit,
  onReset,
  initialValues,
  submitLabel = 'Submit',
  resetLabel = 'Reset',
  showReset = false,
  layout = 'single-column',
  className,
  'aria-label': ariaLabel,
  renderActions,
  submitDisabledWhen,
  classNames,
}: FormConfig) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const defaultValues = useMemo(() => {
    const vals: Record<string, unknown> = {};
    for (const f of fields) {
      vals[f.name] = initialValues?.[f.name] ?? f.defaultValue ?? (f.type === 'checkbox' || f.type === 'toggle' ? false : '');
    }
    return vals;
  }, [fields, initialValues]);

  const defaultCollapsed = useMemo(() => {
    const collapsed: Record<string, boolean> = {};
    if (sections) {
      for (const s of sections) {
        if (s.collapsible && s.defaultCollapsed) {
          collapsed[s.name] = true;
        }
      }
    }
    return collapsed;
  }, [sections]);

  const [state, dispatch] = useReducer(formReducer, {
    values: defaultValues,
    errors: {},
    touched: {},
    status: 'idle' as const,
    submitError: null,
    collapsedSections: defaultCollapsed,
  } satisfies FormState);

  const validationMode = validation?.mode ?? 'onBlur';

  const visibleFields = useMemo(() => {
    const visible = new Set<string>();
    for (const f of fields) {
      if (!f.visible || evaluateCondition(f.visible, state.values)) {
        visible.add(f.name);
      }
    }
    return visible;
  }, [fields, state.values]);

  const validateField = useCallback((fieldDef: FieldDef): string | null => {
    if (!visibleFields.has(fieldDef.name)) return null;

    if (validation?.schema) {
      try {
        validation.schema.parse(state.values);
      } catch (err) {
        const zodErr = err as ZodError;
        const issue = zodErr.issues?.find(i => i.path[0] === fieldDef.name);
        if (issue) return issue.message;
      }
      return null;
    }

    return validateFieldRules(fieldDef, state.values[fieldDef.name]);
  }, [visibleFields, validation, state.values]);

  const validateAll = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (validation?.schema) {
      try {
        validation.schema.parse(state.values);
      } catch (err) {
        const zodErr = err as ZodError;
        for (const issue of zodErr.issues) {
          const name = String(issue.path[0]);
          if (visibleFields.has(name) && !errors[name]) {
            errors[name] = issue.message;
          }
        }
      }
      return errors;
    }

    for (const f of fields) {
      if (!visibleFields.has(f.name)) continue;
      const error = validateFieldRules(f, state.values[f.name]);
      if (error) errors[f.name] = error;
    }
    return errors;
  }, [fields, visibleFields, validation, state.values]);

  const setValue = useCallback((fieldName: string, value: unknown) => {
    dispatch({ type: 'SET_VALUE', field: fieldName, value });
  }, []);

  const touchField = useCallback((fieldName: string) => {
    dispatch({ type: 'TOUCH', field: fieldName });
    if (validationMode === 'onBlur') {
      const fieldDef = fields.find(f => f.name === fieldName);
      if (fieldDef) {
        const error = validateField(fieldDef);
        if (error) {
          dispatch({ type: 'SET_ERROR', field: fieldName, error });
        } else {
          dispatch({ type: 'CLEAR_ERROR', field: fieldName });
        }
      }
    }
  }, [fields, validationMode, validateField]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_STATUS', status: 'validating' });

    for (const f of fields) {
      if (visibleFields.has(f.name)) {
        dispatch({ type: 'TOUCH', field: f.name });
      }
    }

    const errors = validateAll();
    if (Object.keys(errors).length > 0) {
      dispatch({ type: 'SET_ERRORS', errors });
      dispatch({ type: 'SET_STATUS', status: 'error' });

      if (liveRegionRef.current) {
        liveRegionRef.current.textContent =
          `${Object.keys(errors).length} validation error${Object.keys(errors).length > 1 ? 's' : ''} found`;
      }

      const firstErrorField = fields.find(f => errors[f.name]);
      if (firstErrorField && formRef.current) {
        const el = formRef.current.querySelector<HTMLElement>(`[name="${firstErrorField.name}"]`);
        el?.focus();
      }
      return;
    }

    dispatch({ type: 'SET_ERRORS', errors: {} });
    dispatch({ type: 'SET_STATUS', status: 'submitting' });
    dispatch({ type: 'SET_SUBMIT_ERROR', error: null });

    const submissionValues: Record<string, unknown> = {};
    for (const f of fields) {
      if (visibleFields.has(f.name)) {
        submissionValues[f.name] = state.values[f.name];
      }
    }

    try {
      await onSubmit(submissionValues);
      dispatch({ type: 'SET_STATUS', status: 'success' });
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = 'Form submitted successfully';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed';
      dispatch({ type: 'SET_SUBMIT_ERROR', error: message });
      dispatch({ type: 'SET_STATUS', status: 'error' });
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Submission failed: ${message}`;
      }
    }
  }, [fields, visibleFields, validateAll, onSubmit, state.values]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET', values: defaultValues, collapsedSections: defaultCollapsed });
    onReset?.();
  }, [defaultValues, defaultCollapsed, onReset]);

  const fieldGroups = useMemo(() => {
    const groups: { section: SectionDef | null; fields: FieldDef[] }[] = [];
    const sectionMap = new Map<string, SectionDef>();
    if (sections) {
      for (const s of sections) sectionMap.set(s.name, s);
    }

    let currentSection: string | undefined;
    let currentGroup: FieldDef[] = [];

    for (const f of fields) {
      if (!visibleFields.has(f.name)) continue;

      if (f.section !== currentSection) {
        if (currentGroup.length > 0) {
          groups.push({
            section: currentSection ? sectionMap.get(currentSection) ?? null : null,
            fields: currentGroup,
          });
        }
        currentSection = f.section;
        currentGroup = [f];
      } else {
        currentGroup.push(f);
      }
    }
    if (currentGroup.length > 0) {
      groups.push({
        section: currentSection ? sectionMap.get(currentSection) ?? null : null,
        fields: currentGroup,
      });
    }
    return groups;
  }, [fields, sections, visibleFields]);

  const isSubmitting = state.status === 'submitting';

  const contextValue = useMemo<FormContextValue>(() => ({
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    status: state.status,
    setValue,
    touchField,
  }), [state.values, state.errors, state.touched, state.status, setValue, touchField]);

  return (
    <FormContext.Provider value={contextValue}>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        onReset={handleReset}
        aria-label={ariaLabel ?? 'Form'}
        className={classNames?.form ?? className}
        noValidate
        style={classNames?.form ? undefined : {
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--prism-form-gap, 24px)',
        }}
      >
        <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />

        {fieldGroups.map((group, gi) => (
          <FormSection
            key={group.section?.name ?? `group-${gi}`}
            section={group.section}
            collapsed={group.section ? state.collapsedSections[group.section.name] ?? false : false}
            onToggle={group.section ? () => dispatch({ type: 'TOGGLE_SECTION', section: group.section!.name }) : undefined}
            className={classNames?.section}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: layout === 'two-column' ? 'repeat(2, 1fr)' : '1fr',
                gap: 'var(--prism-form-field-gap, 16px)',
              }}
              className="prism-form-grid"
            >
              {group.fields.map(f => (
                <div
                  key={f.name}
                  style={{
                    gridColumn: layout === 'two-column' && f.span === 2 ? '1 / -1' : undefined,
                  }}
                >
                  <FieldRenderer
                    field={f}
                    value={state.values[f.name]}
                    values={state.values}
                    error={state.errors[f.name]}
                    touched={state.touched[f.name] ?? false}
                    disabled={isSubmitting}
                    onChange={v => setValue(f.name, v)}
                    onBlur={() => touchField(f.name)}
                    idPrefix={formId}
                    classNames={classNames}
                  />
                </div>
              ))}
            </div>
          </FormSection>
        ))}

        {state.submitError && (
          <FormFeedback variant="error" role="alert">{state.submitError}</FormFeedback>
        )}
        {state.status === 'success' && (
          <FormFeedback variant="success" role="status">Form submitted successfully</FormFeedback>
        )}

        {(() => {
          const baseStateForPredicate: Omit<FormActionsState, 'submitDisabled' | 'submit' | 'reset'> = {
            status: state.status,
            values: state.values,
            errors: state.errors,
            touched: state.touched,
            submitError: state.submitError,
          };
          const predicateDisabled = submitDisabledWhen?.(baseStateForPredicate) ?? false;
          const submitDisabled = isSubmitting || predicateDisabled;

          if (renderActions) {
            const actionsState: FormActionsState = {
              ...baseStateForPredicate,
              submitDisabled,
              submit: () => {
                if (formRef.current) {
                  formRef.current.requestSubmit();
                }
              },
              reset: handleReset,
            };
            const actionsClass = classNames?.actions;
            return (
              <div
                className={actionsClass}
                style={actionsClass ? undefined : { display: 'flex', gap: 'var(--prism-spacing-sm, 8px)', justifyContent: 'flex-end' }}
              >
                {renderActions(actionsState)}
              </div>
            );
          }

          const actionsClass = classNames?.actions;
          const resetClass = classNames?.resetButton;
          const submitClass = classNames?.submitButton;
          return (
            <div
              className={actionsClass}
              style={actionsClass ? undefined : { display: 'flex', gap: 'var(--prism-spacing-sm, 8px)', justifyContent: 'flex-end' }}
            >
              {showReset && (
                <button
                  type="reset"
                  disabled={isSubmitting}
                  className={resetClass}
                  style={resetClass ? undefined : {
                    padding: 'var(--prism-form-field-padding, 8px 16px)', borderRadius: 'var(--prism-radius-md, 6px)',
                    border: '1px solid var(--prism-color-border-default, #d1d5db)', backgroundColor: 'transparent',
                    color: 'var(--prism-color-text-primary, inherit)', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--prism-font-size-body, 14px)',
                  }}
                >
                  {resetLabel}
                </button>
              )}
              <button
                type="submit"
                disabled={submitDisabled}
                aria-busy={isSubmitting}
                className={submitClass}
                style={submitClass ? undefined : {
                  padding: 'var(--prism-form-field-padding, 8px 16px)', borderRadius: 'var(--prism-radius-md, 6px)',
                  border: 'none', backgroundColor: 'var(--prism-color-interactive-primary, #2563eb)',
                  color: 'var(--prism-color-text-on-primary, white)', cursor: submitDisabled ? 'not-allowed' : 'pointer',
                  fontSize: 'var(--prism-font-size-body, 14px)', opacity: submitDisabled ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Submitting...' : submitLabel}
              </button>
            </div>
          );
        })()}
      </form>

      <style>{`
        @media (max-width: 1023px) {
          .prism-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
    </FormContext.Provider>
  );
}
