# Form Engine (§5.2)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.2 Form Engine

**Purpose**: Renders forms with validation, multi-step navigation, conditional field visibility, file uploads, and submission handling — fully configured from a field schema.

### Props/Configuration

```typescript
interface FormConfig {
  // Field definitions
  fields: FieldDef[];

  // Multi-step (optional)
  steps?: StepDef[];

  // Validation
  validation?: {
    mode: "onBlur" | "onChange" | "onSubmit"; // Default: "onBlur"
    schema?: ZodSchema | YupSchema; // Schema-based validation (overrides per-field)
  };

  // Submission — EITHER onSubmit OR adapter must be provided (since 0.2.1).
  // Passing both is a configuration error: adapter wins and a dev-mode warn
  // fires. Passing neither throws an Error at mount.
  onSubmit?: (values: Record<string, any>) => Promise<void>;

  // Domain adapter (since 0.2.1). See § 5.2.2 — FormAdapter. When present,
  // the adapter owns initial-value seeding, optional async cross-field
  // validation, submit orchestration, and optional post-submit result
  // rendering. Forms with a request→response shape (calculators, "generate"
  // endpoints, payroll runs) should use the adapter path.
  adapter?: FormAdapter<TValues, TResult>;
  submitLabel?: string; // Default: "Submit"
  cancelLabel?: string; // Default: "Cancel"
  onCancel?: () => void;
  showReset?: boolean; // Default: false
  resetLabel?: string; // Default: "Reset"

  // Layout
  layout?: "single-column" | "two-column" | "compact"; // Default: "single-column"
  sectionGap?: SpacingToken; // Default: spacing.section.gap

  // Behavior
  autosave?: {
    enabled: boolean; // Default: false
    intervalMs: number; // Default: 30000 (30 seconds)
    strategy: "debounce" | "interval"; // Default: "debounce"
  };
  confirmDiscard?: boolean; // Default: true (shows "unsaved changes" dialog on navigate away)
  initialValues?: Record<string, any>;

  // Custom action row (since 0.2.0). When present, replaces the default
  // submit+reset button row. Receives the full form state plus submit() and
  // reset() callbacks so consumers can build sticky mobile footers, external
  // reset buttons, multi-step wizard controls, etc.
  renderActions?: (state: FormActionsState) => Component;

  // Predicate-based submit disable (since 0.2.0). Runs in addition to the
  // built-in "disabled while submitting" rule — if either returns true,
  // the submit button is disabled. Enables "disable until form is valid".
  submitDisabledWhen?: (
    state: Omit<FormActionsState, "submitDisabled" | "submit" | "reset">,
  ) => boolean;

  // Per-element className overrides for branded styling (since 0.2.0).
  // When an override is present, the corresponding inline `--prism-*` style
  // fallback is skipped so consumer CSS (Tailwind, CSS modules, anything)
  // wins without specificity fights.
  classNames?: {
    form?: string;
    section?: string;
    field?: string;
    label?: string;
    input?: string;
    error?: string;
    helpText?: string;
    actions?: string;
    submitButton?: string;
    resetButton?: string;
  };
}

interface FormActionsState {
  status: "idle" | "validating" | "submitting" | "success" | "error";
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  submitError: string | null;
  submitDisabled: boolean;
  submit: () => void;
  reset: () => void;
}

interface FieldDef {
  name: string; // Unique field identifier.
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean; // Default: false
  disabled?: boolean; // Default: false
  readOnly?: boolean; // Default: false
  defaultValue?: any;

  // Validation (per-field, used when no schema is provided)
  validation?: FieldValidation[];

  // Conditional visibility
  visible?: ConditionExpression; // When evaluates to false, field is hidden and excluded from submission.

  // Layout
  span?: 1 | 2; // Column span in two-column layout. Default: 1.
  section?: string; // Group name for visual sectioning.

  // Type-specific props
  options?: Option[]; // For "select", "radio", "checkbox-group" types.
  multiSelect?: boolean; // For "select" type. Default: false.
  accept?: string[]; // For "file" type. MIME types. e.g., ["image/*", "application/pdf"]
  maxFileSize?: number; // For "file" type. Max size in bytes.
  maxFiles?: number; // For "file" type. Default: 1.
  min?: number; // For "number" type. Minimum value.
  max?: number; // For "number" type. Maximum value.
  step?: number; // For "number" type. Step increment.
  rows?: number; // For "textarea" type. Visible rows. Default: 3.
  maxLength?: number; // Character limit.

  // Custom renderer (since 0.2.0). When present, replaces the built-in
  // field input while the label / help / error wrapper still renders
  // around it. Use for domain-specific fields (currency input with a $
  // prefix, combobox, inline badge picker, date range picker).
  render?: (ctx: FieldRenderContext) => Component;
}

interface FieldRenderContext<TValue = unknown> {
  value: TValue;
  onChange: (next: TValue) => void;
  onBlur: () => void;
  error: string | undefined;
  touched: boolean;
  disabled: boolean;
  values: Record<string, unknown>; // Full values — use to compute dependent state.
  field: FieldDef; // The FieldDef itself.
  inputId: string; // Stable DOM id for the input.
  describedBy: string | undefined; // aria-describedby id list (help + error).
}

type FieldType =
  | "text"
  | "email"
  | "password"
  | "url"
  | "phone"
  | "number"
  | "currency"
  | "textarea"
  | "select"
  | "multi-select"
  | "radio"
  | "checkbox"
  | "checkbox-group"
  | "toggle"
  | "date"
  | "time"
  | "datetime"
  | "file"
  | "color"
  | "hidden";

interface FieldValidation {
  rule:
    | "required"
    | "email"
    | "url"
    | "min"
    | "max"
    | "minLength"
    | "maxLength"
    | "pattern"
    | "custom"
    | "async";
  value?: any; // Parameter for the rule (e.g., min: 5, pattern: /regex/).
  message: string; // Error message shown on failure.
  asyncValidator?: (value: any) => Promise<string | null>; // For "async" rule. Returns error or null.
}

interface ConditionExpression {
  field: string; // Field name to observe.
  operator:
    | "equals"
    | "notEquals"
    | "contains"
    | "greaterThan"
    | "lessThan"
    | "in"
    | "notIn"
    | "isEmpty"
    | "isNotEmpty";
  value?: any; // Comparison value.
  // Compound conditions:
  and?: ConditionExpression[];
  or?: ConditionExpression[];
}

interface StepDef {
  id: string;
  title: string;
  description?: string;
  fields: string[]; // Field names belonging to this step.
  validation?: "onNext" | "none"; // Default: "onNext" (validate step fields before advancing).
  optional?: boolean; // Default: false. When true, step can be skipped.
}

interface Option {
  value: string | number;
  label: string;
  disabled?: boolean;
}
```

### Internal State

| State            | Type                              | Description                                                |
| ---------------- | --------------------------------- | ---------------------------------------------------------- |
| `values`         | `Record<string, any>`             | Current field values.                                      |
| `errors`         | `Record<string, string[]>`        | Current validation errors per field.                       |
| `touched`        | `Set<string>`                     | Fields the user has interacted with.                       |
| `dirty`          | `Set<string>`                     | Fields whose value differs from `initialValues`.           |
| `isDirty`        | `boolean`                         | True if any field is dirty.                                |
| `isSubmitting`   | `boolean`                         | True during async submission.                              |
| `submitError`    | `string \| null`                  | Server-side error from last submission.                    |
| `submitCount`    | `number`                          | Number of submission attempts.                             |
| `currentStep`    | `number`                          | Current step index (0-indexed). Only for multi-step forms. |
| `stepValidation` | `Record<string, boolean>`         | Per-step validation status. True = step passed validation. |
| `fileUploads`    | `Record<string, FileUploadState>` | Per-file-field upload progress.                            |

### Events/Callbacks

| Event                  | Payload                                                            | When Emitted                                                 |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| `onChange`             | `{ field: string; value: any; values: Record<string, any> }`       | Any field value changes.                                     |
| `onBlur`               | `{ field: string }`                                                | A field loses focus.                                         |
| `onValidate`           | `{ field: string; errors: string[] }`                              | Validation runs on a field (per validation mode).            |
| `onSubmit`             | `Record<string, any>`                                              | Form passes all validation and submits.                      |
| `onSubmitError`        | `{ error: string; values: Record<string, any> }`                   | Submission fails (server error).                             |
| `onStepChange`         | `{ from: number; to: number; direction: "forward" \| "backward" }` | User navigates between steps.                                |
| `onReset`              | `void`                                                             | User resets the form to initial values.                      |
| `onDirtyChange`        | `boolean`                                                          | Form dirty state changes (clean to dirty or dirty to clean). |
| `onFileUploadProgress` | `{ field: string; progress: number; fileName: string }`            | File upload progress update (0-100).                         |

### Composition Points

| Slot                  | Purpose                                                     | Default                                                               |
| --------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `fieldRenderer[name]` | Custom renderer for a specific field.                       | Standard field component based on `type`.                             |
| `sectionHeader`       | Custom section header when fields are grouped by `section`. | Bold label with divider.                                              |
| `stepIndicator`       | Custom step indicator for multi-step forms.                 | `StepIndicator` molecule (horizontal on desktop, vertical on mobile). |
| `submitButton`        | Custom submit button area.                                  | Primary Button with `submitLabel`.                                    |
| `formHeader`          | Content above the form fields.                              | None.                                                                 |
| `formFooter`          | Content below the form fields, above the action buttons.    | None.                                                                 |

### Performance Contract

- **Field render** (target): Each field SHOULD render in < 2ms. Currently aspirational — no benchmark harness in `web/` or `compiler/` verifies this target.
- **Validation** (target): Synchronous validation of all fields SHOULD complete in < 10ms for forms with up to 50 fields. Currently aspirational — no benchmark harness verifies this target.
- **Async validation** (contract): Debounced by 500ms from last keystroke. MUST NOT block form interaction. Loading indicator shown on the field being validated.
- **Conditional visibility** (target): Re-evaluation of all `visible` conditions SHOULD complete in < 5ms when any field value changes. Currently aspirational — no benchmark harness verifies this target.
- **File upload** (contract): Progress callback fires at minimum every 500ms or every 10% progress, whichever is more frequent.
- **Autosave** (contract): MUST NOT block user interaction. Runs in background. If autosave fails, retry once after 5 seconds; on second failure, show non-blocking warning.

> **Performance MUST → SHOULD downgrade (2026-05-06)**: the three `< N ms`
> targets (field render, sync validation, conditional visibility) were
> originally MUSTs. No benchmark harness exists in `web/` or `compiler/`
> to verify any of them; per `rules/spec-accuracy.md` Rule 5 (specs
> describe shipped behavior), MUST clauses without verification are
> aspirational and were downgraded to SHOULD/target language. The
> remaining MUSTs (async-validation, file-upload, autosave) describe
> observable runtime behavior verified through existing integration
> tests, not numeric performance ceilings — those stay MUST.

### Accessibility Contract

- **Form landmark**: `<form>` element (web) with `aria-label` describing the form purpose.
- **Field labels**: Every field MUST have a visible `<label>` associated via `htmlFor`/`for`. Required fields append "(required)" to the label for screen readers.
- **Error association**: Error messages linked via `aria-describedby` on the input. Screen reader announces "{field label}: {error message}" on validation failure.
- **Help text**: Help text linked via `aria-describedby` (separate from error).
- **Keyboard**: Tab moves between fields in document order. Enter on the last field submits the form (unless the field is a textarea). Escape cancels (calls `onCancel`).
- **Multi-step**: Step indicator announces "Step {n} of {total}: {title}". Next/Previous buttons have clear labels. Step validation errors are announced as a group.
- **File upload**: Drop zone announces "Drop files here or press Enter to browse". Upload progress announced as "{fileName}: {progress}% uploaded".
- **Submit state**: Submit button shows loading spinner and is disabled during submission. Screen reader announces "Submitting" and then "Submitted successfully" or "Submission failed: {error}".

### Responsive Contract

| Breakpoint              | Behavior                                                                                                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wide` (1440px+)        | Two-column layout (when `layout: "two-column"`). Fields with `span: 2` take full width.                                                                                                                          |
| `desktop` (1024-1439px) | Two-column layout. Same as wide.                                                                                                                                                                                 |
| `tablet` (768-1023px)   | Single-column layout (forced, regardless of `layout` prop). All fields full width.                                                                                                                               |
| `mobile` (0-767px)      | Single-column layout. Compact field spacing. Multi-step forms show only current step with swipe gesture to navigate (Flutter) or button navigation (web). Step indicator collapses to "{current}/{total}" label. |

### Web Implementation Notes

- Built on `react-hook-form` for form state management.
- Schema validation via `zod` (preferred) or `yup` with `@hookform/resolvers`.
- File upload via `<input type="file">` with drag-and-drop zone using HTML5 Drag API.
- Unsaved changes warning via `beforeunload` event and router navigation guard.
- Autosave via `useEffect` with debounce timer on `values` changes.

### Flutter Implementation Notes

- Built on Flutter's `Form` and `FormField` widgets with Riverpod state management.
- Validation via custom validator functions (no zod/yup equivalent; validation logic is Dart functions).
- File upload via `file_picker` package with platform-specific file selection.
- Multi-step forms use `PageView` with `PageController` for swipe navigation on mobile.
- Unsaved changes warning via `PopScope` with `canPop` parameter (replaces deprecated `WillPopScope`) and custom navigation guard.

---

### Change log

- **2026-05-06** — Performance contract entries reframed: three `< N ms` numeric targets (field render < 2ms, sync validation < 10ms, conditional visibility < 5ms) were originally MUST clauses. No benchmark harness exists in `web/` or `compiler/` to verify any of them. Per `rules/spec-accuracy.md` Rule 5 (specs describe shipped behavior, not aspiration), the three numeric MUSTs were downgraded to SHOULD/target language. Async-validation, file-upload, and autosave entries retain MUST status — they describe observable runtime behavior verified through existing integration tests, not numeric performance ceilings. Surfaced by `/sweep` Sweep 5 supplemental, 2026-05-06 (`SWEEP-2026-05-06.md`).
