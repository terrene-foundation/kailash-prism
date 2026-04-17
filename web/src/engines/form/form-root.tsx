/**
 * Form Engine — Root component with state management, validation, submission
 * Spec: docs/specs/05-engine-specifications.md § 5.2
 */

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
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

// --- Environment detection ---

/**
 * Return true when the bundle was built for production. We read from the
 * ambient globalThis rather than `process.env` directly so the code compiles
 * in both node (tests) and browser (bundler-replaced) environments without
 * needing @types/node on the web package.
 */
function isProductionBuild(): boolean {
  const g = globalThis as { process?: { env?: { NODE_ENV?: string } } };
  return g.process?.env?.NODE_ENV === 'production';
}

// --- Error sanitation ---

/**
 * Max length for a submit-error banner message. Adapter errors propagated
 * verbatim can include stack traces or attacker-controlled echo payloads;
 * truncating + stripping control characters keeps the live region
 * screen-reader-safe and prevents log-injection into aria-live regions.
 */
const SUBMIT_ERROR_MAX_LENGTH = 500;

function sanitizeSubmitError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Submission failed';
  // Strip ASCII control characters except ordinary whitespace. Prevents
  // newline / carriage-return / NUL from disturbing screen reader
  // announcement and log aggregator pipelines.
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  if (stripped.length <= SUBMIT_ERROR_MAX_LENGTH) return stripped;
  return stripped.slice(0, SUBMIT_ERROR_MAX_LENGTH - 1) + '\u2026';
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
  adapter,
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
  if (!onSubmit && !adapter) {
    throw new Error(
      '<Form> requires either `onSubmit` or `adapter`. ' +
      'Pass `adapter` for forms with a post-submit result display, or `onSubmit` for fire-and-forget submissions.',
    );
  }

  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  // Track mounted state so post-await branches in handleSubmit / adapter
  // callbacks bail out on unmount instead of dispatching on a stale
  // reducer or writing to a detached DOM node.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // One-shot guard against the dev warning so inline-adapter consumers
  // (common pattern: `<Form adapter={new MyAdapter()} />`) don't emit a
  // warning per parent render. We only want one warning per component
  // instance, ever.
  const warnedBothPathsRef = useRef(false);
  useEffect(() => {
    if (onSubmit && adapter && !isProductionBuild() && !warnedBothPathsRef.current) {
      warnedBothPathsRef.current = true;
      console.warn(
        '[Form] Both `onSubmit` and `adapter` were provided. The adapter wins; `onSubmit` is ignored. ' +
        'Remove one to silence this warning.',
      );
    }
  }, [onSubmit, adapter]);

  // Adapter-seeded initial values. Resolved EXACTLY ONCE per component
  // instance, regardless of how many times the consumer reconstructs the
  // adapter object (`<Form adapter={new MyAdapter()} />` on every render).
  // This is a CRITICAL invariant — without the one-shot ref, an inline
  // adapter fires `initialValues()` on every parent render, potentially
  // producing an unbounded backend request loop.
  const [adapterSeed, setAdapterSeed] = useState<Record<string, unknown> | null>(null);
  const [adapterSeeded, setAdapterSeeded] = useState<boolean>(!adapter?.initialValues);
  const initialValuesRequestedRef = useRef(false);

  useEffect(() => {
    if (initialValuesRequestedRef.current) return;
    if (!adapter?.initialValues) return;
    initialValuesRequestedRef.current = true;
    let cancelled = false;
    Promise.resolve(adapter.initialValues()).then(
      seed => {
        if (cancelled) return;
        setAdapterSeed(seed);
        setAdapterSeeded(true);
      },
      (err: unknown) => {
        // Form still renders with field defaults so the user has a usable
        // input surface — but we MUST emit a dev signal so the draft-load
        // failure isn't invisible (rules/zero-tolerance.md Rule 3).
        if (cancelled) return;
        setAdapterSeeded(true);
        if (!isProductionBuild()) {
          const message = err instanceof Error ? err.message : String(err);
          console.error('[Form] adapter.initialValues() failed; falling back to field defaults.', message);
        }
      },
    );
    return () => { cancelled = true; };
  }, [adapter]);

  const defaultValues = useMemo(() => {
    const vals: Record<string, unknown> = {};
    for (const f of fields) {
      vals[f.name] =
        initialValues?.[f.name]
          ?? adapterSeed?.[f.name]
          ?? f.defaultValue
          ?? (f.type === 'checkbox' || f.type === 'toggle' ? false : '');
    }
    return vals;
  }, [fields, initialValues, adapterSeed]);

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
    submission: null,
  } satisfies FormState);

  // Re-seed values if the adapter resolves initialValues asynchronously after
  // the reducer's initial state was constructed. Only runs once the adapter
  // has actually reported a seed, so fields the user has already typed into
  // are NOT clobbered by a late-arriving default (the RESET action rebuilds
  // from defaultValues which now includes the adapterSeed).
  const seedApplied = useRef(false);
  useEffect(() => {
    if (seedApplied.current) return;
    if (!adapter?.initialValues) return;
    if (!adapterSeeded || adapterSeed === null) return;
    seedApplied.current = true;
    dispatch({ type: 'RESET', values: defaultValues, collapsedSections: defaultCollapsed });
  }, [adapter, adapterSeeded, adapterSeed, defaultValues, defaultCollapsed]);

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
    // DD-F3: we do NOT clear state.submission here. If the new submit
    // succeeds, the success branch overwrites it; if it fails, the previous
    // cached result stays visible so the user can see what they had before
    // retrying.

    // IMPORTANT: `submissionValues` is a pre-await snapshot of
    // visible-fields at the moment submit began. The post-await branches
    // below MUST NOT re-read `state.values` — the reducer has processed
    // multiple dispatches in the meantime and the closure's `state.values`
    // is stale. Future refactors that need the current values must re-read
    // via a ref or pass through the reducer, not the closure.
    const submissionValues: Record<string, unknown> = {};
    for (const f of fields) {
      if (visibleFields.has(f.name)) {
        submissionValues[f.name] = state.values[f.name];
      }
    }

    // Unmount guard: the component can be unmounted mid-submit (slow
    // payroll endpoints, user navigates away). `isMountedRef` is flipped
    // false in an unmount-effect; the post-await branches bail out when
    // it's false so we never dispatch on a stale reducer or write to a
    // detached DOM node.
    try {
      if (adapter) {
        // Adapter path: run async cross-field validation, then submit, then
        // cache {values, result} for the post-submit render slot.
        if (adapter.validate) {
          const adapterErrors = await adapter.validate(submissionValues);
          if (!isMountedRef.current) return;
          if (adapterErrors && Object.keys(adapterErrors).length > 0) {
            dispatch({ type: 'SET_ERRORS', errors: adapterErrors });
            dispatch({ type: 'SET_STATUS', status: 'error' });
            if (liveRegionRef.current) {
              const n = Object.keys(adapterErrors).length;
              liveRegionRef.current.textContent =
                `${n} validation error${n > 1 ? 's' : ''} found`;
            }
            return;
          }
        }
        const result = await adapter.submit(submissionValues);
        if (!isMountedRef.current) return;
        dispatch({ type: 'SET_SUBMISSION', submission: { values: submissionValues, result } });
        dispatch({ type: 'SET_STATUS', status: 'success' });
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = 'Form submitted successfully';
        }
      } else if (onSubmit) {
        await onSubmit(submissionValues);
        if (!isMountedRef.current) return;
        dispatch({ type: 'SET_STATUS', status: 'success' });
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = 'Form submitted successfully';
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = sanitizeSubmitError(err);
      dispatch({ type: 'SET_SUBMIT_ERROR', error: message });
      dispatch({ type: 'SET_STATUS', status: 'error' });
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Submission failed: ${message}`;
      }
    }
  }, [fields, visibleFields, validateAll, onSubmit, adapter, state.values]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET', values: defaultValues, collapsedSections: defaultCollapsed });
    adapter?.onReset?.();
    onReset?.();
  }, [defaultValues, defaultCollapsed, adapter, onReset]);

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

      {/*
        Post-submit result slot. Rendered outside the <form> so consumer result
        widgets aren't treated as form content (avoids accidental submit on
        Enter inside the result). Only fires when an adapter with
        renderResult is present AND a submission is cached.
      */}
      {adapter?.renderResult && state.submission !== null && (
        <div
          role="region"
          aria-label="Form result"
          data-testid="prism-form-result"
        >
          {adapter.renderResult(state.submission.values, state.submission.result)}
        </div>
      )}

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
