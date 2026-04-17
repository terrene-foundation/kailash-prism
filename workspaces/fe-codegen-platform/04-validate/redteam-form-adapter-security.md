# Redteam — Form Adapter Security (Shard 1 of Prism 0.3.0)

**Scope**: `feat/form-adapter` vs `main`
**Files audited**:
- `web/src/engines/form/form-root.tsx`
- `web/src/engines/form/form-types.ts`
- `web/src/engines/form/form-fields.tsx`
- `web/src/engines/form-adapter.test.tsx` (test scope only)

**Focus**: FormAdapter interface + wiring — XSS surface, error leakage, secrets in logs.

---

## Result

**Zero material security findings.**

No CRITICAL / HIGH / MEDIUM findings. One LOW informational note (observability, not security) is captured below for completeness.

---

## PASSED CHECKS

### PASS-1 — submitError banner renders via React text children (Focus 1)

`form-root.tsx:462` passes `{state.submitError}` as a React child into `<FormFeedback>`, which renders it at `form-root.tsx:84` as `{children}` inside a styled `<div>`. React text children are HTML-escaped by default. No `dangerouslySetInnerHTML`, no `innerHTML`, no template-string concatenation into markup.

The `err.message` that populates `submitError` (lines 341–347) is captured via `err instanceof Error ? err.message : 'Submission failed'` and stored as-is in state. A crafted error message like `<img src=x onerror=alert(1)>` renders as literal text. Verified via grep for `dangerouslySetInnerHTML|innerHTML` on `web/src/engines/form/` — zero matches.

The mirror write to the aria-live region at line 346 uses `.textContent = ...` (not `.innerHTML`), which is the DOM-safe path.

### PASS-2 — renderResult is a consumer boundary; engine contribution is verbatim pass-through (Focus 2)

`form-root.tsx:549–557` invokes `adapter.renderResult(state.submission.values, state.submission.result)` inside a `<div role="region" aria-label="Form result">`. The engine:
- passes `values` and `result` verbatim (no string conversion, no HTML construction);
- never interpolates either argument into markup;
- returns the adapter's `ReactNode` directly as a child.

Any XSS in a consumer's `renderResult` is a consumer-adapter bug, not an engine surface. The engine's contract is "render whatever ReactNode you return," which is the standard React composition contract. No engine-side XSS vector.

### PASS-3 — validate() errors rendered as React text, not HTML (Focus 3)

`Record<string, string>` errors from `adapter.validate` flow via `dispatch({ type: 'SET_ERRORS', errors: adapterErrors })` (line 318) into the reducer's `errors` map, then to `FieldRenderer` via `state.errors[f.name]` (line 447). `form-fields.tsx:299–311` renders them as `{error}` — a React text child inside a `<span>` with `role="alert"`. Auto-escaped. Safe even if the adapter returns a crafted error string.

### PASS-4 — Dev-mode warn does not leak config (Focus 5)

`form-root.tsx:114–119`:
```ts
if (onSubmit && adapter && !isProductionBuild()) {
  console.warn(
    '[Form] Both `onSubmit` and `adapter` were provided. The adapter wins; `onSubmit` is ignored. ' +
    'Remove one to silence this warning.',
  );
}
```
Static string literal only. Neither `onSubmit`, `adapter`, `initialValues`, nor any user values are interpolated into the message. No config surface leaked.

### PASS-5 — Mount-time invariant error is a static string (Focus 6)

`form-root.tsx:108–113` throws with a static API-guidance message when neither `onSubmit` nor `adapter` is provided. Nothing from `FormConfig` props is interpolated into the error. Safe.

### PASS-6 — No secret or PII logger calls on form values (Focus 7)

Grep of `web/src/engines/form/` for `console\.(log|warn|error|info)` returns exactly one match — the dev-mode generic warning at line 115 (covered by PASS-4). Field values, submit payloads, adapter results, and validation errors are never passed through any logging path. The aria-live writes use `.textContent` and do not persist.

### PASS-7 — No secrets, no DB queries, no raw HTML (Focus 8)

- No hardcoded secrets, API keys, or tokens in the diff.
- No SQL or DB-layer calls (frontend engine; not applicable).
- Grep for `dangerouslySetInnerHTML|innerHTML|eval\(|new Function|document\.write|outerHTML` across `web/src/engines/form/` — zero matches.
- The only `<style>` block (`form-root.tsx:559–576`) is a static CSS string with no interpolation from props, state, or adapter output.

---

## LOW

### LOW-FA-1 — `adapter.initialValues()` rejection is silently swallowed (Focus 4)

**Severity**: LOW (observability, not security).
**Not a material security finding.** The reason this appears under LOW rather than as a PASS: the error handler at `form-root.tsx:139–144` discards the rejection reason entirely:

```ts
() => {
  // On adapter.initialValues failure the form still renders with field
  // defaults — an explicit onReset/submit flow remains available.
  if (cancelled) return;
  setAdapterSeeded(true);
},
```

**Security implication**: none. The handler does not leak anything (no message surfaces in the UI, no logger call). The existing comment already documents the UX fallback behaviour.

**Observability implication**: a consumer adapter with a broken `initialValues()` (network failure, thrown auth error, malformed response) gets zero signal in dev or prod. The form simply renders with field defaults as if no adapter seed had been requested. In dev this is harder to diagnose than a loud `console.warn`.

**Recommendation (optional, non-blocking for security)**: In dev-mode only (`!isProductionBuild()`), emit a `console.warn('[Form] adapter.initialValues() rejected; form will render with field defaults.', err)` inside the error handler. This matches the existing dev-warn pattern at line 115 and does not leak anything into production builds. If adopted, ensure `err` is not interpolated into any rendered markup — log-only.

**Explicitly out of scope for security review**: this note is surfaced because the focus area asked for it; there is no security defect to fix.

---

## Summary

| Level | Count |
| --- | --- |
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 1 (observability-only, not a security defect) |
| PASSED | 7 |

The Shard 1 FormAdapter surface is clean from a security standpoint. The engine's text-only render paths (React children + `textContent` for the aria-live region) plus the verbatim pass-through of `values`/`result` to consumer-owned `renderResult` eliminate the XSS vectors. Error messages, dev-mode warnings, and mount-time invariant errors are all static strings; nothing from `FormConfig` or adapter output is interpolated into markup or logs by the engine.
