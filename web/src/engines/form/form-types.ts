/**
 * Form Engine — Types, validation utilities, condition evaluation
 * Spec: docs/specs/05-engine-specifications.md § 5.2
 */

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
}

export interface SectionDef {
  name: string;
  title: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export type FormStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

export interface FormConfig {
  fields: FieldDef[];
  sections?: SectionDef[] | undefined;
  validation?: {
    mode?: 'onBlur' | 'onSubmit';
    schema?: ZodSchema;
  } | undefined;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onReset?: (() => void) | undefined;
  initialValues?: Record<string, unknown> | undefined;
  submitLabel?: string | undefined;
  resetLabel?: string | undefined;
  showReset?: boolean;
  layout?: 'single-column' | 'two-column';
  className?: string | undefined;
  'aria-label'?: string | undefined;
}

// --- Internal state ---

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  status: FormStatus;
  submitError: string | null;
  collapsedSections: Record<string, boolean>;
}

export type FormAction =
  | { type: 'SET_VALUE'; field: string; value: unknown }
  | { type: 'SET_ERROR'; field: string; error: string }
  | { type: 'CLEAR_ERROR'; field: string }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'TOUCH'; field: string }
  | { type: 'SET_STATUS'; status: FormStatus }
  | { type: 'SET_SUBMIT_ERROR'; error: string | null }
  | { type: 'RESET'; values: Record<string, unknown>; collapsedSections: Record<string, boolean> }
  | { type: 'TOGGLE_SECTION'; section: string };

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_VALUE':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        status: state.status === 'error' || state.status === 'success' ? 'idle' : state.status,
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
    case 'RESET':
      return {
        values: action.values,
        errors: {},
        touched: {},
        status: 'idle',
        submitError: null,
        collapsedSections: action.collapsedSections,
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
