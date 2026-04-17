/**
 * Form Engine — Types, validation utilities, condition evaluation
 * Spec: docs/specs/05-engine-specifications.md § 5.2
 */

import type { ReactNode } from 'react';
import { type ZodSchema } from 'zod';

// --- Public types ---

export type FieldType =
  | 'text' | 'email' | 'password' | 'url' | 'tel'
  | 'number'
  | 'textarea'
  | 'select'
  | 'radio' | 'checkbox'
  | 'toggle'
  | 'date'
  | 'file'
  | 'hidden';

export interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export type ConditionOperator =
  | 'equals' | 'notEquals' | 'contains'
  | 'greaterThan' | 'lessThan'
  | 'in' | 'notIn' | 'isEmpty' | 'isNotEmpty';

export interface ConditionExpression {
  field: string;
  operator: ConditionOperator;
  value?: unknown;
  and?: ConditionExpression[];
  or?: ConditionExpression[];
}

export interface FieldValidationRule {
  rule: 'required' | 'email' | 'url' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern';
  value?: unknown;
  message: string;
}

/**
 * Context passed to a `FieldDef.render` custom renderer.
 *
 * Supplied when a consumer wants to replace the built-in field renderer for a
 * specific field (e.g. a currency input with a `$` prefix, a combobox, an
 * inline badge picker). The context exposes the same surface the built-in
 * renderer uses so the custom path does not need to reach into form internals.
 */
export interface FieldRenderContext<TValue = unknown> {
  /** Current field value (as held in Form state). */
  value: TValue;
  /** Update the field value — use inside input onChange handlers. */
  onChange: (next: TValue) => void;
  /** Mark the field as touched — use on input blur. */
  onBlur: () => void;
  /** Validation error message for this field, if any. */
  error: string | undefined;
  /** Whether the field has been touched (blurred at least once). */
  touched: boolean;
  /** Whether the field is disabled (form submitting, field-level disable). */
  disabled: boolean;
  /** Full values object — use to compute dependent field state. */
  values: Record<string, unknown>;
  /** The FieldDef itself — useful for reading label/placeholder/etc. */
  field: FieldDef;
  /** Stable DOM id for the input element (accessibility). */
  inputId: string;
  /** Space-separated list of described-by IDs (help text + error). */
  describedBy: string | undefined;
}

export interface FieldDef {
  name: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: unknown;
  validation?: FieldValidationRule[];
  visible?: ConditionExpression;
  span?: 1 | 2;
  section?: string;
  options?: Option[];
  accept?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  maxLength?: number;
  /**
   * Custom renderer. When provided, replaces the built-in field renderer for
   * this field. Receives the current value, onChange callback, field state
   * (error, touched), and the full values object via a `FieldRenderContext`.
   * The built-in label / help text / error wrapper still renders around the
   * custom input so visual rhythm stays consistent across fields.
   */
  render?: (ctx: FieldRenderContext) => ReactNode;
}

export interface SectionDef {
  name: string;
  title: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export type FormStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

/**
 * State snapshot passed to `renderActions` and `submitDisabledWhen`.
 *
 * Equivalent to the internal `FormState` but with the action callbacks the
 * consumer needs to invoke (`submit`, `reset`) exposed explicitly so the
 * consumer doesn't have to reach into the form's internals.
 */
export interface FormActionsState {
  /** Current form status (idle, validating, submitting, success, error). */
  status: FormStatus;
  /** Full values object. */
  values: Record<string, unknown>;
  /** Current validation errors keyed by field name. */
  errors: Record<string, string>;
  /** Which fields have been touched. */
  touched: Record<string, boolean>;
  /** Submission error message (if `status === 'error'`). */
  submitError: string | null;
  /** Whether the submit button should be disabled (see `submitDisabledWhen`). */
  submitDisabled: boolean;
  /** Trigger a submit programmatically. */
  submit: () => void;
  /** Trigger a reset programmatically. */
  reset: () => void;
}

/**
 * Per-element className overrides for branded form styling.
 *
 * When supplied, each override is applied to the corresponding element in
 * place of the built-in inline style fallback. Consumers who apply a value
 * here can rely on the engine NOT also emitting its default `--prism-*`
 * inline styles for that element, so their Tailwind / CSS rules win without
 * specificity fights.
 */
export interface FormClassNames {
  /** Applied to the `<form>` element. */
  form?: string;
  /** Applied to each section wrapper (`<fieldset>`). */
  section?: string;
  /** Applied to each field group (`<div role="group">`). */
  field?: string;
  /** Applied to each field `<label>`. */
  label?: string;
  /** Applied to inputs (`<input>`, `<select>`, `<textarea>`). */
  input?: string;
  /** Applied to the error `<span>` rendered under a field. */
  error?: string;
  /** Applied to the help-text `<span>` rendered under a field. */
  helpText?: string;
  /** Applied to the actions `<div>` holding submit / reset buttons. */
  actions?: string;
  /** Applied to the submit `<button>`. */
  submitButton?: string;
  /** Applied to the reset `<button>`. */
  resetButton?: string;
}

/**
 * FormAdapter<TValues, TResult> — bridges a Prism Form to a domain service.
 *
 * The parallel with `ChatAdapter` is exact: today the Form engine is a pure
 * view driven by `onSubmit`, and every consumer re-implements the same
 * `{values, result}` state machine around it. `FormAdapter` consolidates the
 * contract so the Form can own submit orchestration, result caching, and
 * the post-submit display lifecycle.
 *
 * Lifecycle:
 *   1. Form mounts. If `adapter.initialValues` is defined, its return (or
 *      resolved Promise) seeds initial state. Any `FormConfig.initialValues`
 *      passed alongside is merged on top (explicit config wins).
 *   2. User fills fields. Per-field `FieldValidationRule`s run as today.
 *   3. On submit, Form calls `adapter.validate(values)` (if defined) for async
 *      cross-field validation. Returned errors are surfaced inline and submit
 *      is cancelled.
 *   4. Form calls `adapter.submit(values)`:
 *        - Success: Form stores `{values, result}` internally, sets
 *          status='success', emits a success feedback banner, and — if
 *          `adapter.renderResult` is defined — renders the result node below
 *          the form.
 *        - Failure: `adapter.submit` throws; Form surfaces the error via its
 *          standard submit-error banner.
 *   5. User edits after submit: Form's internal result state is cleared on
 *      the first value change so the post-submit UI never drifts out of sync
 *      with pending edits.
 *   6. On reset, Form calls `adapter.onReset?.()` for the adapter to clear
 *      its own caches/state.
 *
 * `FormAdapter` and `FormConfig.onSubmit` are mutually-exclusive submission
 * paths; when both are provided the adapter wins and a development-mode
 * warning fires (the engine never silently picks one over the other).
 */
export interface FormAdapter<
  TValues extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> {
  /** Optional: seed initial values (e.g. load a draft from backend). */
  initialValues?(): TValues | Promise<TValues>;

  /**
   * Optional async validation beyond per-field `FieldValidationRule`s.
   * Returns a map of fieldName → message for any invalid fields. An empty
   * object (or absent key) means valid. Called on submit BEFORE `submit()`.
   */
  validate?(values: TValues): Promise<Record<string, string>> | Record<string, string>;

  /** Required. Perform the actual submit (API call, local computation). */
  submit(values: TValues): Promise<TResult> | TResult;

  /**
   * Optional: render the result below the form. When defined, Form owns the
   * "submitted" state internally and eliminates the boilerplate every
   * consumer writes today. Return `null` to suppress (e.g. when the adapter
   * navigated away on success).
   */
  renderResult?(values: TValues, result: TResult): ReactNode;

  /** Optional: clear adapter caches / state on form reset. */
  onReset?(): void;
}

export interface FormConfig {
  fields: FieldDef[];
  sections?: SectionDef[] | undefined;
  validation?: {
    mode?: 'onBlur' | 'onSubmit';
    schema?: ZodSchema;
  } | undefined;
  /**
   * Fire-and-forget submit handler. Required unless `adapter` is provided —
   * when `adapter` is present, `adapter.submit` supersedes `onSubmit` and
   * this field may be omitted. If both are supplied the adapter wins and a
   * dev-mode warning fires.
   */
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
  /**
   * Domain adapter that owns submit orchestration, optional async validation,
   * and optional result rendering. See `FormAdapter`. Use an adapter when the
   * form has a post-submit result to display (calculators, "generate"
   * endpoints, etc.) — the engine will cache `{values, result}` internally
   * and render it below the form without the consumer writing any state
   * machine.
   */
  adapter?: FormAdapter;
  onReset?: (() => void) | undefined;
  initialValues?: Record<string, unknown> | undefined;
  submitLabel?: string | undefined;
  resetLabel?: string | undefined;
  showReset?: boolean;
  layout?: 'single-column' | 'two-column';
  className?: string | undefined;
  'aria-label'?: string | undefined;
  /**
   * Render the form's action row (submit / reset / anything else) in place of
   * the built-in submit+reset buttons. Receives the full form state plus the
   * `submit` and `reset` handlers so consumers can build custom action UI
   * (sticky mobile footer, external "Reset" alongside submit, multi-step
   * wizard controls) without wrapping the whole form.
   */
  renderActions?: (state: FormActionsState) => ReactNode;
  /**
   * Compute whether the submit button should be disabled given the current
   * form state. Runs in addition to the built-in "disabled while submitting"
   * behaviour — if either rule says disable, the button is disabled. Useful
   * for "submit disabled until form is valid" patterns.
   */
  submitDisabledWhen?: (state: Omit<FormActionsState, 'submitDisabled' | 'submit' | 'reset'>) => boolean;
  /**
   * Per-element className overrides for branded styling. See `FormClassNames`.
   * When an override is present, the corresponding inline style fallback is
   * skipped so consumer CSS wins without specificity fights.
   */
  classNames?: FormClassNames;
}

// --- Internal state ---

/**
 * Captured result from the most recent successful adapter submit. Stored on
 * `FormState.submission`; cleared on the next field edit and on reset.
 */
export interface FormSubmission {
  values: Record<string, unknown>;
  result: unknown;
}

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  status: FormStatus;
  submitError: string | null;
  collapsedSections: Record<string, boolean>;
  /**
   * Most recent successful adapter submit, or `null`. Only populated when a
   * `FormAdapter` is in use — `onSubmit` callers never see this field change.
   */
  submission: FormSubmission | null;
}

export type FormAction =
  | { type: 'SET_VALUE'; field: string; value: unknown }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'TOUCH'; field: string }
  | { type: 'SET_STATUS'; status: FormStatus }
  | { type: 'SET_SUBMIT_ERROR'; error: string | null }
  | { type: 'SET_SUBMISSION'; submission: FormSubmission | null }
  | { type: 'RESET'; values: Record<string, unknown>; collapsedSections: Record<string, boolean> }
  | { type: 'TOGGLE_SECTION'; section: string };

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_VALUE':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        status: state.status === 'error' || state.status === 'success' ? 'idle' : state.status,
        // Editing after a successful adapter submit invalidates the cached
        // result — dropping it prevents the post-submit UI from drifting out
        // of sync with pending edits.
        submission: state.submission !== null && state.status === 'success' ? null : state.submission,
      };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.field]: action.error } };
    case 'CLEAR_ERROR': {
      const next = { ...state.errors };
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete next[action.field];
      return { ...state, errors: next };
    }
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'TOUCH':
      return { ...state, touched: { ...state.touched, [action.field]: true } };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_SUBMIT_ERROR':
      return { ...state, submitError: action.error };
    case 'SET_SUBMISSION':
      return { ...state, submission: action.submission };
    case 'RESET':
      return {
        values: action.values,
        errors: {},
        touched: {},
        status: 'idle',
        submitError: null,
        collapsedSections: action.collapsedSections,
        submission: null,
      };
    case 'TOGGLE_SECTION':
      return {
        ...state,
        collapsedSections: {
          ...state.collapsedSections,
          [action.section]: !state.collapsedSections[action.section],
        },
      };
  }
}

// --- Condition evaluation ---

export function evaluateCondition(
  condition: ConditionExpression,
  values: Record<string, unknown>,
  depth: number = 0,
): boolean {
  if (depth > 3) return true;

  const fieldValue = values[condition.field];
  let result = true;

  switch (condition.operator) {
    case 'equals':
      result = fieldValue === condition.value;
      break;
    case 'notEquals':
      result = fieldValue !== condition.value;
      break;
    case 'contains':
      result = typeof fieldValue === 'string' && typeof condition.value === 'string'
        ? fieldValue.includes(condition.value)
        : false;
      break;
    case 'greaterThan':
      result = typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue > condition.value
        : false;
      break;
    case 'lessThan':
      result = typeof fieldValue === 'number' && typeof condition.value === 'number'
        ? fieldValue < condition.value
        : false;
      break;
    case 'in':
      result = Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false;
      break;
    case 'notIn':
      result = Array.isArray(condition.value) ? !condition.value.includes(fieldValue) : true;
      break;
    case 'isEmpty':
      result = fieldValue === undefined || fieldValue === null || fieldValue === '';
      break;
    case 'isNotEmpty':
      result = fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      break;
  }

  if (condition.and) {
    result = result && condition.and.every(c => evaluateCondition(c, values, depth + 1));
  }
  if (condition.or && !result) {
    result = condition.or.some(c => evaluateCondition(c, values, depth + 1));
  }

  return result;
}

// --- Per-field validation ---

export function validateFieldRules(fieldDef: FieldDef, value: unknown): string | null {
  if (fieldDef.required && (value === undefined || value === null || value === '')) {
    return `${fieldDef.label} is required`;
  }

  if (!fieldDef.validation) return null;

  for (const rule of fieldDef.validation) {
    switch (rule.rule) {
      case 'required':
        if (value === undefined || value === null || value === '') return rule.message;
        break;
      case 'email':
        if (typeof value === 'string' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return rule.message;
        }
        break;
      case 'url':
        if (typeof value === 'string' && value) {
          try { new URL(value); } catch { return rule.message; }
        }
        break;
      case 'min':
        if (typeof value === 'number' && typeof rule.value === 'number' && value < rule.value) {
          return rule.message;
        }
        break;
      case 'max':
        if (typeof value === 'number' && typeof rule.value === 'number' && value > rule.value) {
          return rule.message;
        }
        break;
      case 'minLength':
        if (typeof value === 'string' && typeof rule.value === 'number' && value.length < rule.value) {
          return rule.message;
        }
        break;
      case 'maxLength':
        if (typeof value === 'string' && typeof rule.value === 'number' && value.length > rule.value) {
          return rule.message;
        }
        break;
      case 'pattern':
        if (typeof value === 'string' && rule.value instanceof RegExp && !rule.value.test(value)) {
          return rule.message;
        }
        break;
    }
  }
  return null;
}
