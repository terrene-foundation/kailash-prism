# FormAdapter (§5.2.2)

> Spec version: 0.1.0 | Status: DRAFT | Parent: [05 Engine Specifications](05-engine-specifications.md)

---

## 5.2.2 FormAdapter<TValues, TResult> (since 0.2.1)

**Status**: SHIPPED in 0.2.1. First consumer: arbor `/calculators-prism` (planned migration, M-01 findings).

### Overview

`FormAdapter<TValues, TResult>` is a transport-agnostic bridge between a Prism Form engine instance and a domain service. It is to Form what `ChatAdapter` (§ 5.6) is to AI Chat: a small, plain-async interface that owns submit orchestration, optional async cross-field validation, optional initial-value seeding, and optional post-submit result rendering.

The adapter replaces the `{values, result}` state machine every consumer re-implements around `onSubmit` today. Before the adapter, a calculator page needed ~150 LOC of page shell + ~360 LOC of result rendering to wire Form to its backend; with the adapter, the same page is ~60 LOC and the result renderer moves into the adapter class.

### Interface

```typescript
interface FormAdapter<
  TValues extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
> {
  /** Optional: seed initial values (e.g. load a draft from backend). */
  initialValues?(): TValues | Promise<TValues>;

  /**
   * Optional async validation beyond per-field FieldValidationRule.
   * Returns a map of fieldName → message for any invalid fields. An empty
   * object (or absent key) means valid. Called on submit BEFORE submit().
   */
  validate?(values: TValues): Promise<Record<string, string>> | Record<string, string>;

  /** Required. Perform the actual submit (API call, local computation). */
  submit(values: TValues): Promise<TResult> | TResult;

  /**
   * Optional: render the result below the form. When defined, Form owns the
   * "submitted" state internally and eliminates the boilerplate every
   * consumer writes today. Return null to suppress (e.g. adapter navigated
   * away on success).
   */
  renderResult?(values: TValues, result: TResult): ReactNode;

  /** Optional: clear adapter caches / state on form reset. */
  onReset?(): void;
}
```

### Lifecycle

1. Form mounts. If `adapter.initialValues` is defined, its return (or resolved Promise) seeds initial state. Any `FormConfig.initialValues` prop is merged on top (explicit config wins per-field).
2. User fills fields. Per-field `FieldValidationRule`s run as today.
3. On submit, Form calls `adapter.validate(values)` (if defined) for async cross-field validation. Returned errors are surfaced inline and submit is cancelled.
4. Form calls `adapter.submit(values)`:
   - **Success**: Form caches `{values, result}` internally, sets status='success', emits the success feedback banner, and — if `adapter.renderResult` is defined — renders the result node below the form inside a `<div role="region" aria-label="Form result">`.
   - **Failure**: `adapter.submit` throws; Form surfaces the error via its standard submit-error banner. Engine sanitizes the error message: strips ASCII control characters (prevents aria-live log-injection) and truncates to 500 characters with a trailing ellipsis. Consumers can still pre-sanitize with a `sanitizeErrorMessage` helper (see `rules/security.md`) for domain-specific redaction, but the engine-side sanitizer guarantees baseline safety.
5. User edits after submit: Form's internal result state is cleared on the first value change so the post-submit UI never drifts out of sync with pending edits. This applies to ALL `SET_VALUE` dispatches, not just user-typed ones — programmatic `setValue` from a custom renderer after a successful submit clears the cache too (see DD-F3).
6. On reset (button click or programmatic `reset()` via `renderActions`), Form calls `adapter.onReset?.()` for the adapter to clear its own caches/state. The cached submission is cleared automatically.
7. **Unmount safety**: if the component unmounts while `adapter.submit` / `adapter.validate` is in flight, the post-await branches bail out before dispatching on the stale reducer or writing to the detached DOM. No React "state update on unmounted component" warnings; no DOM leaks.

### Design Decisions

#### DD-F1: Adapter OR onSubmit — mutually exclusive submission paths

Passing both `onSubmit` and `adapter` is a configuration error. The adapter wins AND a dev-mode `console.warn` fires **at most once per Form instance** (guarded by a `useRef` so inline-adapter parents that re-render N times don't produce N warnings). Rationale: without the warn, the engine silently picks one and the bug surfaces as "my onSubmit isn't being called." The warn makes the precedence visible to the consumer at first render.

Passing neither throws a clear `Error` at mount with the actionable message: `<Form> requires either 'onSubmit' or 'adapter'. Pass 'adapter' for forms with a post-submit result display, or 'onSubmit' for fire-and-forget submissions.` This is a dev-time failure, not a runtime one — consumers catch it on first unit test.

#### DD-F2: `renderResult` lives on the adapter, not on FormConfig

Considered: add `FormConfig.renderResult?(submission) => ReactNode` alongside `onSubmit`. Rejected because the `{values, result}` state and the render function belong to the same domain concern — separating them forces the consumer to thread the result shape across two places. Keeping them on the adapter class is the single-responsibility shape every HR workflow already uses manually.

#### DD-F3: Cached submission clears on edit, not on submit-error

When ANY `SET_VALUE` dispatch happens after `status === 'success'`, the cached result clears immediately — whether the dispatch came from user typing, blur, a custom renderer's programmatic `setValue`, or an imperative call through `useFormContext().setValue`. The reducer does not (and cannot) distinguish the source of a value change.

When the user submits and the adapter throws, the previous cached result stays visible — so the user can see what they had before retrying. Only a NEW successful submit overwrites the cache. The engine does NOT clear the cache at the start of a new submit; the clear happens exclusively inside the success branch and inside the edit-after-success path above.

Consumers that want to re-hydrate form fields from a submitted result (e.g. "apply these computed values back into the inputs as read-only previews") MUST accept that doing so clears the cached result. If the workflow needs both (re-hydrated fields AND a visible result), store the result in the adapter class and re-read it from `renderResult` rather than relying on the cached submission.

#### DD-F4: `adapter.initialValues` errors fall back to defaults, don't block render

If `adapter.initialValues()` rejects, the form still renders using field defaults. An error in backend draft-loading MUST NOT prevent the user from filling the form from scratch. This matches `rules/zero-tolerance.md` Rule 3 (no silent fallbacks) by emitting a dev-mode `console.error('[Form] adapter.initialValues() failed; falling back to field defaults.', message)` so the draft-load failure is visible in the dev console — and leaving the form in a usable state for the user.

`adapter.initialValues()` is resolved EXACTLY ONCE per component instance. A `useRef` guard prevents inline-adapter consumers (`<Form adapter={new MyAdapter()} />` constructing a fresh object on every parent render) from producing an unbounded backend request loop. The effect dependency array includes `adapter`, but the one-shot ref ensures the resolver fires at most once.

#### DD-F5: No generics on FormConfig itself

`FormAdapter<TValues, TResult>` is generic; `FormConfig` is NOT. Rationale: making `FormConfig` generic would force every existing consumer to either add `FormConfig<Record<string, unknown>, unknown>` everywhere or accept inferred types that may not match their domain. Keeping `FormConfig.adapter?: FormAdapter` non-generic at the config boundary preserves source-compat for every call site in the wild; the adapter class itself remains fully typed.

### Method Justifications

| Method            | Required? | Evidence                                              | LOC saved (est)  | Failure mode prevented                                        |
| ----------------- | --------- | ----------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| `submit`          | Required  | Every M-01 calculator has this shape                  | baseline         | Consumer owns submit error handling per-page                  |
| `renderResult`    | Optional  | M-01 finds 360 LOC of result rendering per consumer   | ~300 LOC / page  | Each consumer re-implements `{values, result}` state machine  |
| `initialValues`   | Optional  | Not surfaced in M-01 but needed for "edit draft"      | ~30 LOC          | Consumer loads draft manually, passes to `initialValues` prop |
| `validate`        | Optional  | Needed for "name is taken" async checks               | ~40 LOC          | Consumer threads async errors through onSubmit manually       |
| `onReset`         | Optional  | Needed for clearing cached compute results on reset   | ~10 LOC          | Form reset leaves stale adapter state that breaks next submit |

### Comparison to DataTableAdapter

Both use the same shape: required core (`submit` / `fetchPage+getRowId+capabilities`) + optional extensions. Both are transport-agnostic (consumer implements the interface, engine drives the methods). Both emit state changes through the engine's normal channels (errors flow through the standard banner; results flow through a declarative render slot).

Key differences:
- DataTable's `capabilities()` exists because table operations vary by backend (some sort server-side, some client-side); Form's submit is universal (every form submits), so no capabilities method.
- Form has no `subscribe` analogue — forms are request/response, not stream.
- DataTable has `rowActions` / `bulkActions` as declarative action arrays; Form has no analogue because a form has only ONE submit.

### Migration path from `onSubmit`

Non-breaking addition. Existing `onSubmit`-only forms continue to work with zero source changes. Consumers who want the post-submit render slot migrate by:

1. Extract `handleSubmit` logic into an `adapter.submit(values)` method.
2. Extract the result render JSX into `adapter.renderResult(values, result)`.
3. Remove the page's `useState<{values, result} | null>` and its clear-on-edit effect.
4. Replace `<Form onSubmit={handleSubmit} />` with `<Form adapter={adapter} />`.

For forms WITHOUT a result display (fire-and-forget submissions — contact forms, feedback forms), `onSubmit` remains the correct API. No forced migration.

---
