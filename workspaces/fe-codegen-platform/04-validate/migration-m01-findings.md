# M-01 Migration Findings — Arbor Calculators → Prism Form Engine

**Date**: 2026-04-14
**Migration**: arbor `/calculators` → `/calculators-prism`
**Scope**: 7 HR calculators (cpf, quota-levy, leave, notice-period, overtime, retrenchment, cost-to-company)
**Engine under test**: `@kailash/prism-web` Form (v0.1.0, installed via `/tmp/kailash-prism-web-0.1.0.tgz`)

---

## Executive summary

The Prism Form engine is **fit for straight declarative HR forms** and covered
~90% of the migration cleanly. All 7 calculators migrated with:

- Zero bespoke `<input>` in page bodies
- Zero `as unknown as T`, zero `@ts-expect-error`
- Visual parity with bespoke (same `ResultPanel` / `ResultRow` reused; same
  header and back-link chrome; same validation messages)
- One `ConditionExpression` exercised per calculator that needs it (CPF and
  Cost-to-Company both hide `prYear` when `citizenship !== "pr"`)
- Real API call for CPF via `calculatorsApi.cpf()`; real local computation for
  the other six (bespoke also computes those client-side — there is no backend
  for them, the "local tables" ARE the authoritative computation)

The ~10% that's awkward is entirely around the **result display lifecycle**:
Form has no first-class concept of "what happens after submit succeeds." The
result state must live in the parent page, which means every adopter
re-implements the same {values, result} state machine. This is the single
biggest finding and motivates the proposed `FormAdapter` interface below.

### Headline answer: **Yes, Form should have a FormAdapter interface.**

The parallel with `ChatAdapter` is exact: today `Form` is a pure view with
`onSubmit`, and every consumer re-implements result caching, error mapping,
and submit orchestration. A `FormAdapter` would consolidate the contract.
Sketch below under "Proposed FormAdapter interface."

---

## What worked

### FormConfig shape
- `FieldDef[]` covered every field this migration needed (`text`, `number`,
  `select`). `step: 0.5` for "Years of Service" worked exactly like the bespoke
  `AppInput step="0.5"`.
- `SectionDef` cleanly handled the "Headcount Breakdown" subheading for
  quota-levy — declarative grouping without a bespoke `<h3>`.
- `layout: "two-column"` with `span: 2` for full-width fields (e.g. the "Leave
  Category" select) gave the same grid the bespoke route uses.
- `defaultValue` + `required` are ergonomic; both work exactly like a hand-rolled
  `useState` initialiser.

### FieldDef types that fit naturally
| Bespoke | Prism | Status |
|---|---|---|
| `AppInput variant="number"` | `{ type: "number", min, max, step }` | Exact match |
| `AppInput variant="select" options={...}` | `{ type: "select", options }` | Exact match |
| `placeholder` / `helperText` | `placeholder` / `helpText` | Exact match |
| `min`/`max` HTML attributes | `min`/`max` on FieldDef | Exact match |

### Validation
`FieldValidationRule` covered every constraint the bespoke forms enforced.
Client-side pre-submit validation with typed error messages — no silent loss
of validation coverage.

### ConditionExpression
Clean, declarative. `{ field: "citizenship", operator: "equals", value: "pr" }`
replaces a hand-rolled `{citizenship === "pr" && <AppInput ... />}` in JSX.
Exercised in **2 of 7** calculators (CPF, cost-to-company). This was the most
satisfying single feature — it moves conditional-field logic from JSX rendering
into the config, which is exactly the point of a declarative form engine.

### Real API submission
For CPF, `calculatorsApi.cpf(request)` is called directly from `compute()`. If
the backend returns 500 or the network fails, the promise rejects, Prism Form
catches it in `handleSubmit`, and displays a red error banner with
`err.message`. Parity with bespoke's red error box was preserved without extra
wiring.

---

## What didn't

### [BLOCKING-1] `FieldDef` has no custom `render` hook
`web/src/engines/form/form-types.ts:46-68` — `FieldDef` exposes `type` as a
closed enum of built-in types. There is no escape hatch like
`render: (ctx) => ReactNode` for a consumer to plug in a custom field
(e.g. a currency input with a `$` prefix, a combobox, a date-range picker).
This migration did NOT need a custom field type — but arbor's real payslip
and documents workflows (M-02, M-03) will hit this wall the moment they need
an autocomplete or an inline badge. **Fix**: add `render?: (ctx: FieldRenderContext) => ReactNode` to `FieldDef`, fall through to the built-in renderer when absent.

### [BLOCKING-2] No post-submit "result" concept in Form
`web/src/engines/form/form-root.tsx:74-401` — `Form` treats `onSubmit` as
fire-and-forget. There is no way for the Form to know that the submit
produced a result object that should be displayed BELOW the form. Every
adopter re-implements this:

```ts
const [submitted, setSubmitted] = useState<{values, result} | null>(null);
const handleSubmit = async (values) => {
  const result = await config.compute(values);
  setSubmitted({ values, result });
};
```

This is the single biggest integration friction in the migration and
motivates the `FormAdapter` interface below. **Fix**: see Proposed
FormAdapter section — add an `afterSubmit` render slot OR accept an adapter
that exposes both `submit()` and stateful `result`.

### [BLOCKING-3] `Form` forces its own submit button placement
`web/src/engines/form/form-root.tsx:362-378` — Submit button is rendered
inside `<form>` at flex-end of the container. No way to render it elsewhere
(e.g. sticky footer on mobile, or alongside an external "Reset" outside the
card). Bespoke arbor uses `w-full sm:w-auto` alignment; Prism forces
`justifyContent: 'flex-end'`. **Fix**: expose a `renderActions?: (state) => ReactNode` slot OR publish a `useFormActions()` hook for consumers that want the button outside the form body.

### [BLOCKING-4] `Form` submit button cannot be disabled conditionally
The submit button is disabled only when `status === 'submitting'`. There's no
way to disable it based on form validity (e.g. "disable until all required
fields pass"). Bespoke arbor doesn't need this for the calculators, but
payment/payslip forms will. **Fix**: add `submitDisabledWhen?: (state) => boolean` OR expose `<Form.SubmitButton>` as a separate sub-component the consumer can place.

### [BLOCKING-5] `Form` styling is inline `style={{...}}`, not token-driven class names
`web/src/engines/form/form-fields.tsx:49-59` — Every field renders with
inline CSS referencing `--prism-*` CSS variables. Arbor's design tokens use
`--color-primary`, `--color-gray-900`, etc. Fields render with Prism tokens
that don't exist in arbor's Tailwind config, so they fall back to the hardcoded
defaults (`#d1d5db`, `#2563eb`). The form fields are SLIGHTLY off-brand
compared to the bespoke `AppInput`. This is not a blocker for the pilot
(they're still usable and accessible) but it breaks visual parity for any
brand-sensitive consumer. **Fix**: (a) ship a token-compiler output that maps
arbor tokens to `--prism-*` at build time, OR (b) accept a `classNames={{field, label, error}}` override prop on Form so consumers can swap in Tailwind classes.

### [NON-BLOCKING-1] `FieldDef.validation` rule types are duplicated with `required`
`web/src/engines/form/form-types.ts:40-44` — You can write
`{ required: true }` at the FieldDef level AND `{ rule: "required", message }`
in `validation[]`. Both work. The "required" error message is hardcoded as
`"${label} is required"` (see `validateFieldRules:224`). There's no way to
customise the required message without using the validation array. Minor
ergonomic friction. **Fix**: move the required-message override into the
top-level `FieldDef.requiredMessage?: string`.

### [NON-BLOCKING-2] `FieldValidationRule.rule` union is small
`web/src/engines/form/form-types.ts:40-44` — Rules cover `required`, `email`,
`url`, `min`, `max`, `minLength`, `maxLength`, `pattern`. No cross-field
validation (e.g. "confirmPassword must equal password"). The migration didn't
need it, but M-02/M-03 probably will. **Fix**: add a `custom: (values) => string | null` rule, OR lean on the `validation.schema?: ZodSchema` entry that already exists (but is undocumented — it works! Finding that out required reading source).

### [NON-BLOCKING-3] `FieldDef` has no i18n support
All labels, placeholders, helpText, and validation messages are plain strings.
Fine for English-only arbor, but anyone with a multi-lingual UI will re-wrap
every config with a `t()` call. **Fix**: accept `string | () => string` everywhere, or document the i18n pattern explicitly.

### [NON-BLOCKING-4] `number` field emits `undefined` on empty, but the Form's defaultValue fills it to `""`
`web/src/engines/form/form-fields.tsx:191-200` — empty number input calls
`onChange(undefined)`. But `form-root.tsx:92-98` initialises the field to `""`
(an empty string) for any non-checkbox/toggle type. So a "cleared" number
field has value `undefined`, and a "never-touched" number field has value `""`.
Both render blank in the DOM, but `asNumber(values.foo)` has to handle both
(see `lib/prism-calculator-utils.ts:asNumber`). Mild papercut; documenting
the convention would suffice.

### [NON-BLOCKING-5] `Form` submits with values from all-visible fields, but visibility is only checked at submit time
If a conditional field was visible, had a value entered, then became hidden,
the hidden value is silently dropped at submit (see `form-root.tsx:226-232`).
This is usually desirable but was surprising — documenting the behaviour
(or emitting a dev-mode console.warn when non-empty hidden values are dropped)
would reduce confusion.

### [NON-BLOCKING-6] Grid `ResponsiveValue<number>` accepts `{mobile, tablet, desktop, wide}` but the named keys aren't discoverable
`engines/layout.d.ts:40` — `ResponsiveValue<T> = Partial<Record<Breakpoint, T>>`
and `Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'`. Passing
`columns={{ mobile: 1, tablet: 2, desktop: 2, wide: 2 }}` works; the type
infers correctly. But the breakpoint keys aren't exported as a constant so a
consumer can't `for (const bp of BREAKPOINT_KEYS)`. Minor.

### [NON-BLOCKING-7] No built-in "form reset on result" pattern
After a successful submit in the calculators, the form KEEPS the values so the
user can tweak and re-submit. That's correct UX for this pilot. But a "clear
form on success" pattern would require a manual `onReset()` after the async
submit resolves, which Form doesn't expose. **Fix**: add
`resetOnSuccess?: boolean` to FormConfig.

### Things I had to work around (all cleanly, no unsafe casts)

1. **Circular import between configs and results renderers** — the configs
   file needed to import the render functions (runtime), and the results file
   needed to import the result type interfaces + `fmtMoney`/`fmtPct`
   helpers (both runtime and types). This created a cycle. **Resolution**:
   split into 3 modules:
   - `prism-calculator-types.ts` — type-only definitions
   - `prism-calculator-utils.ts` — formatters (`fmtMoney`, `asNumber`, ...)
   - `prism-calculator-configs.ts` + `prism-calculator-results.tsx` — each
     imports from types/utils, no cycle
   Not a Prism bug, but worth noting as a pattern recommendation for docs.

2. **Registry type widening** — `Record<CalculatorType, CalculatorConfig>`
   forces the value type to the default generic `CalculatorConfig<CalculatorResult>`.
   Each specific config was declared as e.g. `CalculatorConfig<CpfResult>`,
   which is a subtype. TS warned that the cast at registry-build time is
   "widening" — I used `as CalculatorConfig` which is sound because
   `renderResult` is always called with the result returned from `compute`,
   and those match up by construction. But this pattern is common enough
   that a Prism-side helper or a "config registry" type wouldn't hurt.
   **No unsafe casts** — `as CalculatorConfig` is a widening of a compatible
   generic, not a `as unknown as T`.

3. **`exactOptionalPropertyTypes` not set in arbor** — the user's task notes
   said to target it. Arbor's `tsconfig.json` has `strict: true` but does NOT
   set `exactOptionalPropertyTypes: true`. I coded as if it were on anyway:
   `FormConfig` is assembled via spread with `...(config.sections ? { sections } : {})`
   so `sections` is only present when defined, not `undefined`. This will
   survive a future tightening without edits.

---

## Proposed FormAdapter interface

**Yes, Form should have an adapter.** The parallel with `ChatAdapter` is exact:
the Chat engine was initially a pure view; consumers re-implemented streaming,
history loading, and conversation CRUD. The adapter consolidated the contract.
Form is at the same stage — `onSubmit` is the current "pure view" API, and
every consumer writes the same `{values, result}` state machine around it.

```typescript
/**
 * FormAdapter<TValues, TResult> — bridges a Prism Form to a domain service.
 *
 * Lifecycle:
 *   1. Form mounts → adapter.initialValues() seeds defaults (optional)
 *   2. User fills fields → adapter.validate(partial) runs on blur (optional,
 *      complements per-field FieldValidationRule)
 *   3. User submits → Form calls adapter.submit(values)
 *      - Success: adapter returns TResult, Form emits SubmittedEvent with
 *        {values, result}, optionally renders adapter.renderResult below
 *      - Failure: adapter throws, Form surfaces via its error banner
 *   4. User edits after submit → Form emits EditedEvent; adapter.onEdited?()
 *      can clear the result or keep it for "tweak and re-submit"
 */
interface FormAdapter<TValues extends Record<string, unknown>, TResult> {
  /** Optional: seed initial values (e.g. load a draft from backend). */
  initialValues?(): TValues | Promise<TValues>;

  /**
   * Optional async validation beyond the per-field FieldValidationRule.
   * Returns a map of fieldName → message for any invalid fields.
   * Called on form submit before submit() if provided.
   */
  validate?(values: TValues): Promise<Record<string, string>>;

  /** Required. Perform the actual submit (API call, local computation). */
  submit(values: TValues): Promise<TResult>;

  /**
   * Optional: render the result below the form. If present, Form owns the
   * "submitted" state internally and eliminates the boilerplate every
   * consumer writes today.
   */
  renderResult?(values: TValues, result: TResult): ReactNode;

  /** Optional: clear result / state on reset. */
  onReset?(): void;
}
```

### Usage (what the M-01 detail page SHOULD look like)

```tsx
const adapter = new ArborCalculatorAdapter(type); // wraps compute+renderResult

<Form
  fields={config.fields}
  adapter={adapter}
  layout="two-column"
  submitLabel={config.submitLabel}
/>
```

The page component shrinks from 153 LOC to ~60 LOC. The `submitted` state,
the `useCallback`, the `handleSubmit` wrapper, and the conditional
`<ResultPanel>` rendering all move into Form + the adapter. Every downstream
calculator, payslip form, claim form, payroll run, leave request, etc. gets
the same treatment with zero boilerplate.

### What the FormAdapter contract does NOT need to solve

- **Streaming** — forms are request/response, not stream. `ChatAdapter.sendMessage()` returning a `ChatStreamHandle` has no Form analog.
- **History** — forms are stateless per submission. `ChatAdapter.loadMessages()` has no Form analog. Multi-step drafts (wizard-style save-and-continue) is a separate feature.
- **Per-field data sources** — a select with options loaded from a backend is a field concern (`FieldDef.optionsAdapter?()`), not a form-wide adapter concern.

---

## Prism blocking gaps (for M-04 to fix)

- `[BLOCKING-1] web/src/engines/form/form-types.ts:46-68 — FieldDef has no custom render hook — add render?: (ctx) => ReactNode`
- `[BLOCKING-2] web/src/engines/form/form-root.tsx:74-401 — Form has no post-submit result concept — add FormAdapter interface (see above) OR afterSubmit render slot`
- `[BLOCKING-3] web/src/engines/form/form-root.tsx:362-378 — submit button placement is hardcoded — add renderActions?: (state) => ReactNode slot`
- `[BLOCKING-4] web/src/engines/form/form-root.tsx:362-378 — submit button cannot be conditionally disabled — add submitDisabledWhen?: (state) => boolean`
- `[BLOCKING-5] web/src/engines/form/form-fields.tsx:49-59 — field styling is inline and uses prism-specific CSS vars, breaks brand parity — add classNames override OR token compiler output for arbor`

## Prism non-blocking gaps (for /codify)

- `[NON-BLOCKING-1] web/src/engines/form/form-types.ts:40-44 — required-message is hardcoded — add FieldDef.requiredMessage?: string`
- `[NON-BLOCKING-2] web/src/engines/form/form-types.ts:40-44 — no cross-field validation rule — add custom rule OR document schema escape hatch`
- `[NON-BLOCKING-3] web/src/engines/form/form-types.ts:46-68 — no i18n for labels/placeholders/messages — accept string | () => string`
- `[NON-BLOCKING-4] web/src/engines/form/form-fields.tsx:191-200 — number field emits undefined vs "" asymmetry — document convention or normalise`
- `[NON-BLOCKING-5] web/src/engines/form/form-root.tsx:226-232 — hidden-field values silently dropped at submit — add dev-mode warn`
- `[NON-BLOCKING-6] web/src/engines/layout.ts — BREAKPOINTS exported but Breakpoint keys aren't enumerated for iteration`
- `[NON-BLOCKING-7] web/src/engines/form/form-types.ts:79-95 — no resetOnSuccess option — add to FormConfig`

---

## Visual / UX observations

### Parity hits
- Header, back link, icon chrome — identical to bespoke (I reused the same
  markup).
- `ResultPanel` and `ResultRow` reused as-is from the bespoke elements; result
  display is pixel-identical.
- Conditional `prYear` field toggles smoothly on citizenship change (CPF,
  cost-to-company). Small UX win over bespoke: fewer conditional-render JSX
  branches in the page, same behaviour.
- Responsive 2-column layout collapses to 1-column on mobile (tested via the
  `@media (max-width: 1023px)` rule Prism ships inline in Form).

### Parity misses
- Field borders and focus rings use Prism's hardcoded `#d1d5db` / `#2563eb`
  defaults (the `--prism-*` CSS variables aren't defined in arbor's stylesheet).
  The fields look slightly off-brand vs bespoke `AppInput`. See BLOCKING-5.
- Prism's submit button is right-aligned and fixed-width. Bespoke used
  `w-full sm:w-auto` (full-width on mobile, auto on desktop). See BLOCKING-3.
- Prism's field labels use `font-weight: 500`. Bespoke uses `text-sm font-medium`
  which resolves to the same weight but a different line-height inheritance.
  Imperceptible.

### Migration-authoring observations (meta)

- **Declarative >> imperative** — moving from `useState`+`onChange`+`onSubmit`
  to `FieldDef[]`+`compute` cut each calculator from ~150 LOC of JSX+state to
  ~50 LOC of config. Total config file is 1091 LOC for 7 calculators, or 156
  LOC avg, vs bespoke elements averaging 200 LOC each — roughly 22% smaller
  per calculator AND the config is pure data (easier to diff, review, regenerate).
- **Registry lookup >> 7 page components** — bespoke has 7 `{Calculator}.tsx`
  files wired through a `CALCULATOR_COMPONENTS: Record<string, ComponentType>`
  map in the [type] route. Prism version has 1 detail page + 1 config file.
  Adding an 8th calculator is a 30-LOC change in `prism-calculator-configs.ts`
  plus a 1-line addition to the `CalculatorType` union.
- **The real cost is result rendering** — the 360-LOC `prism-calculator-results.tsx`
  file is the non-declarative residue. It exists because Form has no concept
  of a result. With the proposed FormAdapter + `renderResult` hook, this file
  would move into the adapter classes (one per calculator) and the detail
  page would become ~40 LOC.

---

## Recommendation

**Proceed with M-02 and M-03 as planned.** The Form engine handles
straightforward declarative forms well. Before M-02 (payroll) starts, M-04
should land **BLOCKING-2 (FormAdapter)** — payroll workflows have many
"submit → compute → review → confirm" cycles and will hit the boilerplate
wall immediately.

**BLOCKING-1 (custom render), BLOCKING-3 (action slot), BLOCKING-5 (class overrides)**
are cumulative — individually workable via parent-owned state and CSS
overrides, but together they force every adopter into a "wrap Form in my own
Form2" pattern. Landing them in M-04 before M-02/M-03 prevents that drift.

**The engine is working.** This is a clean pilot, not a failed experiment —
the findings above are all API-surface refinements, not fundamental flaws.
One migration, concrete feedback, no rework required.

---

## Visual / UX deviations (added 2026-04-14, M-08 convergence)

Per `rules/specs-authority.md` MUST Rule 6, calculator behaviour deltas between
the bespoke `/calculators/[type]` and the prism `/calculators-prism/[type]`
routes are logged here as explicit acknowledged deviations.

### Notice Period — salary-in-lieu calculation (M1 from wave-2 red team)

- **Bespoke** (`src/app/(dashboard)/calculators/elements/NoticePeriodCalculator.tsx:47,55,80-83`): displays `noticeWeeks = max(contractWeeks, statutoryWeeks)` BUT computes `salaryInLieu` from the unreconciled `noticeWeeks` set on line 47 (uses raw `contractWeeks` when contract > 0, ignoring statutory floor). Latent bug.
- **Prism** (`src/lib/prism-calculator-configs.ts` notice-period entry): uses `effectiveNoticeWeeks = max(contractWeeks, statutoryWeeks)` everywhere — display and salary-in-lieu both reflect the higher figure.
- **User impact**: a user comparing the two routes with `contract=2, statutory=4` weeks will see different salary-in-lieu values. Prism's value is correct; bespoke understates.
- **Disposition**: prism is correct. The bespoke calculator should be fixed in a separate todo (filed in `/codify` follow-ups). NOT a wave-2 regression.

### Form field styling (H1 from wave-2 red team)

- **Pre-fix**: Prism `<Form>` rendered with default `--prism-*` greys / blue when arbor's CSS variables were unset.
- **Fix landed**: `src/lib/prism-form-classnames.ts` exports `ARBOR_FORM_CLASS_NAMES` that mirrors `AppInput` / `AppButton` Tailwind classes. `calculators-prism/[type]/page.tsx` consumes it.
- **Disposition**: parity restored.

### Submit error sanitisation (S2 from wave-2 security red team)

- **Pre-fix**: `compute()` errors re-thrown verbatim; Prism's `submitError` banner rendered raw backend strings.
- **Fix landed**: `handleSubmit` wraps the throw in `new Error(sanitizeErrorMessage(err))`; backend bodies never reach the UI.
- **Disposition**: deviation acknowledged — `submitError` text now uses controlled vocabulary ("Something went wrong. Please try again." or HTTP-status-tailored equivalents) instead of raw backend output. User notified: NO (security-only change, no UX shift expected).
