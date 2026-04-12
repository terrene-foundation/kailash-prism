# B-02: Web Form Engine

## Priority: HIGH (second highest time-savings)
## Source: Plan Sprint B1; docs/specs/05-engine-specifications.md § 5.2

## Description

Build the Form engine — validation (zod), multi-section layout, conditional field visibility, file upload, submission handling with loading states, reset, and error display.

## Acceptance Criteria

1. Form component accepts FieldDef[] schema to generate form structure
2. Validation: zod schema integration, per-field and cross-field validation
3. Multi-section: organize fields into collapsible sections
4. Conditional visibility: show/hide fields based on other field values
5. Field types: text, textarea, select, checkbox, radio, toggle, date, file, number, email, url, tel, password
6. File upload: drag-and-drop zone, progress bar, multi-file
7. Submission: loading state, success/error feedback, onSubmit callback
8. Reset: form-level and field-level reset
9. Multi-step (wizard): step indicator, per-step validation, navigation
10. Accessibility: form landmarks, aria-describedby for errors, field grouping
11. Responsive: two-column on desktop, single-column on mobile
12. Tests: unit tests for validation, integration tests for form flows

## Key Spec References

- docs/specs/05-engine-specifications.md § 5.2 (Form engine)
- specs/components/form.yaml (organism contract)
- specs/components/form-field.yaml (molecule contract)
- 04-validate/engine-spec-gaps.md (ConditionExpression nesting)
