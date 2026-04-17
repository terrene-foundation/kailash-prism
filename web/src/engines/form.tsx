/**
 * Form Engine — Public API
 * Spec: docs/specs/05-engine-specifications.md § 5.2
 *
 * Re-exports all public types and components from the form directory.
 * This file is the consumer-facing entry point.
 */

export {
  Form,
  useFormContext,
  FieldRenderer,
  FormSection,
  evaluateCondition,
  validateFieldRules,
  formReducer,
  type FieldType,
  type Option,
  type ConditionOperator,
  type ConditionExpression,
  type FieldValidationRule,
  type FieldDef,
  type FieldRenderContext,
  type SectionDef,
  type FormStatus,
  type FormConfig,
  type FormState,
  type FormAction,
  type FormActionsState,
  type FormClassNames,
  type FormAdapter,
  type FormSubmission,
} from './form/index.js';
